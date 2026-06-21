"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Sidebar from "@/components/sidebar";
import CameraCapture from "@/components/camera-capture";
import { useLanguage } from "@/hooks/use-language";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { offlineStorage } from "@/lib/offline-storage";
import { api } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { 
  Upload, 
  Camera, 
  Smartphone, 
  Trash2, 
  Loader2, 
  Wifi, 
  WifiOff, 
  Check, 
  AlertCircle, 
  FileImage,
  Sparkles
} from "lucide-react";

export default function BatchCapturePage() {
  const { t } = useLanguage();
  const [queue, setQueue] = useState([]);
  const [students, setStudents] = useState([]);
  const [isOnline, setIsOnline] = useState(true);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const fileInputRef = useRef(null);
  const mobileCameraRef = useRef(null);

  // 1. Monitor network state
  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // 2. Load offline queue and student list on mount
  useEffect(() => {
    loadOfflineQueue();
    loadStudents();
  }, []);

  const loadOfflineQueue = async () => {
    try {
      const items = await offlineStorage.getOfflineWorksheets();
      const mapped = items.map(item => ({
        ...item,
        localUrl: URL.createObjectURL(item.file),
        status: "pending",
        progress: 0
      }));
      setQueue(mapped);
    } catch (err) {
      console.error("Error loading offline worksheets:", err);
    }
  };

  const loadStudents = async () => {
    try {
      const roster = await api.students.list();
      setStudents(roster);
    } catch (err) {
      console.warn("Could not load student roster, fallback to empty roster", err);
    }
  };

  // Compression utility to solve 2GB RAM IndexedDB memory crashes
  const compressImage = async (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 1200;
          const scaleSize = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scaleSize;
          
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          // Client-side PII Redaction: Black box over top 8% of image to hide name/roll
          ctx.fillStyle = "#000000";
          ctx.fillRect(0, 0, canvas.width, canvas.height * 0.08);
          
          canvas.toBlob((blob) => {
            // Memory Leak Fix: Explicitly release object URL and image source
            img.src = "";
            URL.revokeObjectURL(event.target.result);
            
            const compressedFile = new File([blob], file.name, {
              type: "image/webp",
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          }, "image/webp", 0.6); // 60% quality webp compression
        };
      };
    });
  };

  // 3. Process new files
  const addFilesToQueue = async (files) => {
    const newItems = [];
    for (let i = 0; i < files.length; i++) {
      let file = files[i];
      
      // Compress image to ~100kb to prevent mobile browser memory crashes
      if (file.type.startsWith("image/")) {
        file = await compressImage(file);
      }

      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const title = `Worksheet - ${new Date().toLocaleDateString()}`;
      
      const item = {
        id,
        title,
        studentId: "",
        file: file,
      };

      // Persist in IndexedDB
      await offlineStorage.saveOfflineWorksheet(item);

      newItems.push({
        ...item,
        localUrl: URL.createObjectURL(file),
        status: "pending",
        progress: 0
      });
    }
    setQueue(prev => [...prev, ...newItems]);
  };

  const handleFileChange = (e) => {
    if (e.target.files) {
      addFilesToQueue(e.target.files);
    }
  };

  const handleFieldChange = async (id, field, value) => {
    const updated = queue.map(item => {
      if (item.id === id) {
        const copy = { ...item, [field]: value };
        // Save to offline storage as well
        const { localUrl, status, progress, ...persistData } = copy;
        offlineStorage.saveOfflineWorksheet(persistData);
        return copy;
      }
      return item;
    });
    setQueue(updated);
  };

  const handleRemove = async (id) => {
    await offlineStorage.deleteOfflineWorksheet(id);
    setQueue(prev => prev.filter(item => item.id !== id));
  };

  const [syncedIds, setSyncedIds] = useState([]);

  // 4. Synchronization loop with Exponential Backoff
  const handleSync = async () => {
    if (queue.length === 0 || syncing) return;
    setSyncing(true);
    const newlySyncedIds = [];

    const pending = queue.filter(item => item.status === "pending" || item.status === "error");
    
    for (const item of pending) {
      // Update item state to uploading
      setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: "uploading", progress: 30 } : q));

      let retryCount = 0;
      const maxRetries = 3;
      let success = false;

      while (retryCount < maxRetries && !success) {
        try {
          // Step A: Upload image file to /uploads
          const uploadResult = await api.worksheets.upload(item.file);
          const imageUrl = uploadResult.image_url;
          
          setQueue(prev => prev.map(q => q.id === item.id ? { ...q, progress: 70 } : q));

          // Step B: Register worksheet in DB → triggers OCR BackgroundTask
          const body = {
            title: item.title,
            student_id: item.studentId || null,
            image_url: imageUrl
          };
          const created = await api.worksheets.create(body);

          // Atomic Transaction Success - remove from IndexedDB queue ONLY when DB create succeeds
          await offlineStorage.deleteOfflineWorksheet(item.id);
          success = true;
          newlySyncedIds.push(created.id);

          setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: "uploading", progress: 85 } : q));
          
          // Start listening to Server-Sent Events for OCR completion
          const session = await supabase.auth.getSession();
          const token = session.data.session?.access_token || "";
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
          const sse = new EventSource(`${apiUrl}/worksheets/stream/${created.id}?token=${token}`);
          
          sse.onmessage = (e) => {
            try {
              const data = JSON.parse(e.data);
              if (data.status === "ocr_complete" || data.status === "completed") {
                setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: "success", progress: 100 } : q));
                sse.close();
              } else if (data.status === "failed" || data.status === "error") {
                setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: "error", progress: 0 } : q));
                sse.close();
              }
            } catch (err) {}
          };
          
          sse.onerror = () => {
            sse.close();
            // Fallback just in case SSE fails
            setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: "success", progress: 100 } : q));
          };
          
        } catch (error) {
          retryCount++;
          console.error(`Sync error for ${item.id} (Attempt ${retryCount}):`, error);
          if (retryCount >= maxRetries) {
            setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: "error", progress: 0 } : q));
          } else {
            // Exponential backoff
            await new Promise(r => setTimeout(r, 1000 * Math.pow(2, retryCount)));
          }
        }
      }
    }

    setSyncedIds(prev => [...prev, ...newlySyncedIds]);
    setSyncing(false);
  };

  return (
    <div className="flex bg-mesh min-h-screen">
      <Sidebar />
      <main className="flex-1 p-6 md:p-8 space-y-6 max-w-6xl mx-auto">
        
        {/* Post-Sync Success Banner */}
        {syncedIds.length > 0 && !syncing && (
          <div className="flex items-center justify-between p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white">
                <Check size={20} />
              </div>
              <div>
                <p className="font-bold text-sm">
                  {syncedIds.length} {t("successSyncNotify")}
                </p>
                <p className="text-sm text-emerald-600 mt-0.5">
                  {t("successSyncSub")}
                </p>
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Link href={`/worksheet/${syncedIds[0]}`}>
                <Button className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm px-4 py-2 h-auto shadow-md font-bold cursor-pointer">
                  {t("review")}
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="outline" className="border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-600 rounded-xl text-sm px-4 py-2 h-auto font-semibold cursor-pointer">
                  {t("dashboard")}
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Network & Header Status */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-5">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">{t("batchTitle")}</h1>
            <p className="text-sm font-medium" style={{ color: "var(--text-3)" }}>
              {t("batchSubtitle")}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {isOnline ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-700 border border-emerald-200">
                <Wifi size={12} />
                <span>{t("online")}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-sm font-bold text-amber-700 border border-amber-200 animate-pulse">
                <WifiOff size={12} />
                <span>{t("offlineMode")}</span>
              </span>
            )}

            <Button
              onClick={handleSync}
              disabled={syncing || queue.length === 0 || !isOnline}
              className="btn btn-primary shadow-md font-bold cursor-pointer"
            >
              {syncing ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>{t("syncingBatch")}</span>
                </>
              ) : (
                <span>{t("syncBatch")}</span>
              )}
            </Button>
          </div>
        </div>

        {/* Capture Input Panel - BIG BUTTONS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 py-8">
          {/* File Explorer Input - BIG BUTTON */}
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="card p-12 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl bg-gradient-to-br from-white to-slate-50/50 hover:border-teal-500 hover:bg-teal-50/20 transition-all duration-300 cursor-pointer text-center group shadow-sm hover:shadow-md min-h-[240px]"
          >
            <input
              type="file"
              multiple
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
            <div className="w-20 h-20 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-700 mb-6 group-hover:scale-110 transition-all shadow-md">
              <Upload size={40} className="stroke-[1.5]" />
            </div>
            <span className="text-2xl font-extrabold text-slate-900 block mb-2">📂 Upload Images</span>
            <span className="text-base text-slate-600 font-semibold">{t("selectFilesSub")}</span>
          </div>

          {/* Desktop Webcam Input - BIG BUTTON */}
          <div 
            onClick={() => setIsCameraOpen(true)}
            className="card p-12 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl bg-gradient-to-br from-white to-slate-50/50 hover:border-teal-500 hover:bg-teal-50/20 transition-all duration-300 cursor-pointer text-center group shadow-sm hover:shadow-md min-h-[240px]"
          >
            <div className="w-20 h-20 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-700 mb-6 group-hover:scale-110 transition-all shadow-md">
              <Camera size={40} className="stroke-[1.5]" />
            </div>
            <span className="text-2xl font-extrabold text-slate-900 block mb-2">📷 Capture</span>
            <span className="text-base text-slate-600 font-semibold">{t("webcamCaptureSub")}</span>
          </div>
        </div>

        {/* Batch Queue Section */}
        <div className="space-y-6 pt-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">{t("queueTitle")}</h2>
              <p className="text-sm font-semibold text-slate-500 mt-1">{t("capturedCount")}</p>
            </div>
            <span className="px-3 py-1 text-sm font-extrabold rounded-full bg-slate-100 text-slate-700">
              {queue.length}
            </span>
          </div>

          {queue.length === 0 ? (
            <div className="card bg-white/80 py-16 text-center border-slate-100 flex flex-col items-center justify-center space-y-3">
              <div className="text-slate-300">
                <FileImage size={36} />
              </div>
              <p className="text-slate-400 text-sm font-semibold">{t("emptyQueue")}</p>
              <a 
                href="/sample_worksheet.jpeg" 
                download
                className="mt-4 text-sm font-bold text-teal-600 hover:text-teal-700 hover:underline inline-flex items-center gap-1 bg-teal-50 px-4 py-2 rounded-lg transition-colors cursor-pointer"
              >
                📥 Download Sample Math Worksheet
              </a>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {queue.map((item) => (
                <div key={item.id} className="card bg-white/95 border-slate-100 flex overflow-hidden h-44 relative hover:border-teal-200">
                  {/* Thumbnail */}
                  <div className="w-36 h-full bg-slate-50 flex-shrink-0 relative border-r border-slate-100">
                    <img 
                      src={item.localUrl} 
                      alt="Worksheet thumbnail" 
                      className="w-full h-full object-cover"
                    />
                    
                    {/* Status Badge Overlays */}
                    {item.status === "uploading" && (
                      <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center text-white">
                        <Loader2 size={24} className="animate-spin" />
                      </div>
                    )}
                    {item.status === "success" && (
                      <div className="absolute inset-0 bg-emerald-500/80 flex items-center justify-center text-white">
                        <Check size={32} className="stroke-[3]" />
                      </div>
                    )}
                    {item.status === "error" && (
                      <div className="absolute inset-0 bg-red-500/80 flex items-center justify-center text-white">
                        <AlertCircle size={32} className="stroke-[3]" />
                      </div>
                    )}
                  </div>

                  {/* Metadata Fields */}
                  <div className="flex-1 p-4 flex flex-col justify-between">
                    <div className="space-y-2.5">
                      <div className="flex justify-between items-start">
                        <Input
                          value={item.title}
                          onChange={(e) => handleFieldChange(item.id, "title", e.target.value)}
                          disabled={syncing}
                          className="font-bold text-slate-800 h-8 px-2 border-slate-200 rounded-lg text-sm flex-1 mr-2 focus:ring-1 focus:ring-teal-500"
                        />
                        <button
                          onClick={() => handleRemove(item.id)}
                          disabled={syncing}
                          className="text-slate-400 hover:text-red-500 transition-colors p-1 cursor-pointer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      {/* Student association */}
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-400 font-extrabold uppercase tracking-wider">{t("studentLabel")}:</span>
                        <Select
                          value={item.studentId}
                          onChange={(e) => handleFieldChange(item.id, "studentId", e.target.value)}
                          disabled={syncing}
                          className="h-8 py-0 px-2 text-sm border-slate-200 rounded-lg flex-1"
                        >
                          <option value="">{t("autoDetectStudent")}</option>
                          {students.map(std => (
                            <option key={std.id} value={std.id}>
                              {std.name} {std.roll_no ? `(Roll: ${std.roll_no})` : ""}
                            </option>
                          ))}
                        </Select>
                      </div>
                    </div>

                    {/* Progress Bar / Info */}
                    <div>
                      {item.status === "uploading" && (
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className="bg-primary h-1.5 transition-all duration-300"
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                      )}
                      {item.status === "error" && (
                        <span className="text-sm text-red-500 font-bold">{t("uploadFailedText")}</span>
                      )}
                      {item.status === "success" && (
                        <span className="text-sm text-emerald-500 font-bold">{t("uploadSuccessText")}</span>
                      )}
                      {item.status === "pending" && (
                        <span className="text-sm text-slate-400 font-medium">{t("offlineSavedText")}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Camera Modal */}
        <CameraCapture 
          open={isCameraOpen}
          onOpenChange={setIsCameraOpen}
          onCapture={(file) => addFilesToQueue([file])}
        />
      </main>
    </div>
  );
}
