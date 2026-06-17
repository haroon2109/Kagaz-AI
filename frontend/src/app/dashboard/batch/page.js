"use client";

import React, { useState, useEffect, useRef } from "react";
import Sidebar from "@/components/sidebar";
import CameraCapture from "@/components/camera-capture";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { offlineStorage } from "@/lib/offline-storage";
import { api } from "@/lib/api";

export default function BatchCapturePage() {
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

  // 3. Process new files (from drag-drop, file upload, or camera)
  const addFilesToQueue = async (files) => {
    const newItems = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
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

  // 4. Synchronization loop
  const handleSync = async () => {
    if (queue.length === 0 || syncing) return;
    setSyncing(true);

    const pending = queue.filter(item => item.status === "pending" || item.status === "error");
    
    for (const item of pending) {
      // Update item state to uploading
      setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: "uploading", progress: 30 } : q));

      try {
        // Step A: Upload file to storage
        const uploadResult = await api.worksheets.upload(item.file);
        const imageUrl = uploadResult.image_url;
        
        setQueue(prev => prev.map(q => q.id === item.id ? { ...q, progress: 70 } : q));

        // Step B: Register worksheet in FastAPI database
        const body = {
          title: item.title,
          image_url: imageUrl,
          student_id: item.studentId || null
        };
        await api.worksheets.create(body);

        // Success: Remove from local IndexedDB and update state
        await offlineStorage.deleteOfflineWorksheet(item.id);
        setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: "success", progress: 100 } : q));
      } catch (err) {
        console.error(`Sync failed for item ${item.id}:`, err);
        setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: "error", progress: 0 } : q));
      }
    }
    setSyncing(false);
  };

  return (
    <div className="flex bg-slate-50 min-h-[calc(100vh-64px)]">
      <Sidebar />
      <main className="flex-1 p-6 md:p-8 space-y-6 max-w-6xl mx-auto">
        {/* Network & Header Status */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Batch Worksheet Capture</h1>
            <p className="text-slate-500">Capture, preview, configure, and sync multiple worksheet pages offline.</p>
          </div>
          
          <div className="flex items-center gap-3">
            {isOnline ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Online
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 border border-amber-200 animate-pulse">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                Offline Mode (Local Storage)
              </span>
            )}

            <Button
              onClick={handleSync}
              disabled={syncing || queue.length === 0 || !isOnline}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md transition-colors"
            >
              {syncing ? "Syncing Batch..." : "Sync Batch"}
            </Button>
          </div>
        </div>

        {/* Capture Input Panel */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* File Explorer Input */}
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 rounded-2xl bg-white hover:bg-slate-50 transition-colors cursor-pointer text-center"
          >
            <input
              type="file"
              multiple
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
            <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375 0 11-.75 0 .375 0 01.75 0z" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-slate-700 block">Select from Files</span>
            <span className="text-xs text-slate-400">Choose multiple images</span>
          </div>

          {/* Desktop Webcam Input */}
          <div 
            onClick={() => setIsCameraOpen(true)}
            className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 rounded-2xl bg-white hover:bg-slate-50 transition-colors cursor-pointer text-center"
          >
            <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15a2.25 2.25 0 002.25-2.25V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-slate-700 block">Webcam Capture</span>
            <span className="text-xs text-slate-400">Stream laptop camera</span>
          </div>

          {/* Mobile Camera Input */}
          <div 
            onClick={() => mobileCameraRef.current?.click()}
            className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 rounded-2xl bg-white hover:bg-slate-50 transition-colors cursor-pointer text-center"
          >
            <input
              type="file"
              ref={mobileCameraRef}
              onChange={handleFileChange}
              accept="image/*"
              capture="environment"
              className="hidden"
            />
            <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-6 18.75h9" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-slate-700 block">Mobile Capture</span>
            <span className="text-xs text-slate-400">Open mobile camera</span>
          </div>
        </div>

        {/* Batch Queue Section */}
        <div>
          <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            Worksheet Batch Queue
            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-200 text-slate-700">
              {queue.length} Captured
            </span>
          </h2>

          {queue.length === 0 ? (
            <Card className="bg-white border shadow-sm rounded-2xl py-16 text-center">
              <p className="text-slate-400 text-sm font-light">No items in the batch capture queue.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {queue.map((item) => (
                <Card key={item.id} className="bg-white border shadow-sm rounded-2xl flex overflow-hidden h-44 relative">
                  {/* Thumbnail */}
                  <div className="w-36 h-full bg-slate-100 flex-shrink-0 relative">
                    <img 
                      src={item.localUrl} 
                      alt="Worksheet thumbnail" 
                      className="w-full h-full object-cover"
                    />
                    
                    {/* Status Badge Overlays */}
                    {item.status === "uploading" && (
                      <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center text-white">
                        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                    {item.status === "success" && (
                      <div className="absolute inset-0 bg-emerald-500/80 flex items-center justify-center text-white text-3xl font-bold">
                        ✓
                      </div>
                    )}
                    {item.status === "error" && (
                      <div className="absolute inset-0 bg-red-500/80 flex items-center justify-center text-white text-3xl font-bold">
                        !
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
                          className="font-semibold text-slate-800 h-8 px-2 border-slate-200 rounded-lg text-sm flex-1 mr-2"
                        />
                        <button
                          onClick={() => handleRemove(item.id)}
                          disabled={syncing}
                          className="text-slate-400 hover:text-red-500 transition-colors p-1"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                        </button>
                      </div>

                      {/* Student association */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400 font-semibold uppercase">Student:</span>
                        <Select
                          value={item.studentId}
                          onChange={(e) => handleFieldChange(item.id, "studentId", e.target.value)}
                          disabled={syncing}
                          className="h-8 py-0 px-2 text-xs border-slate-200 rounded-lg flex-1"
                        >
                          <option value="">(Auto-detect or Select)</option>
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
                            className="bg-indigo-600 h-1.5 transition-all duration-300"
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                      )}
                      {item.status === "error" && (
                        <span className="text-xs text-red-500 font-medium">Sync failed. Try again when online.</span>
                      )}
                      {item.status === "success" && (
                        <span className="text-xs text-emerald-500 font-medium">Worksheet uploaded & graded.</span>
                      )}
                      {item.status === "pending" && (
                        <span className="text-xs text-slate-400 font-light">Saved offline. Ready to sync.</span>
                      )}
                    </div>
                  </div>
                </Card>
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
