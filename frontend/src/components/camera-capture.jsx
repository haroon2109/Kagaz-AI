"use client";

import React, { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function CameraCapture({ open, onOpenChange, onCapture }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState("");
  const [error, setError] = useState("");

  // Get list of video devices
  useEffect(() => {
    if (open) {
      navigator.mediaDevices.enumerateDevices()
        .then((deviceList) => {
          const videoDevices = deviceList.filter(d => d.kind === "videoinput");
          setDevices(videoDevices);
          if (videoDevices.length > 0) {
            setSelectedDevice(videoDevices[0].deviceId);
          }
        })
        .catch((err) => {
          console.error("Error enumerating devices:", err);
          setError("Failed to list camera devices");
        });
    }
  }, [open]);

  // Start video stream when device changes or modal opens
  useEffect(() => {
    if (open && selectedDevice) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [open, selectedDevice]);

  const startCamera = async () => {
    stopCamera();
    setError("");
    try {
      const constraints = {
        video: {
          deviceId: selectedDevice ? { exact: selectedDevice } : undefined,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError("Unable to access camera. Please check permissions.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const handleCapture = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `capture-${Date.now()}.jpg`, { type: "image/jpeg" });
          onCapture(file);
          onOpenChange(false);
        }
      }, "image/jpeg", 0.9);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] bg-slate-950 border border-slate-800 text-white rounded-2xl p-6 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold bg-gradient-to-r from-teal-400 to-teal-200 bg-clip-text text-transparent">Camera Capture</DialogTitle>
          <DialogDescription className="text-slate-400 text-sm">
            Align the worksheet squarely inside the camera frame.
          </DialogDescription>
        </DialogHeader>

        <div className="relative aspect-video w-full overflow-hidden bg-slate-900 border border-slate-800 rounded-xl my-4 flex items-center justify-center">
          {error ? (
            <div className="p-4 text-center text-red-400 text-sm">{error}</div>
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover"
            />
          )}
        </div>

        {devices.length > 1 && (
          <div className="flex items-center gap-2 text-sm text-slate-400 mb-4">
            <span>Select Camera:</span>
            <select
              value={selectedDevice}
              onChange={(e) => setSelectedDevice(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-200 outline-none"
            >
              {devices.map((device, idx) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Camera ${idx + 1}`}
                </option>
              ))}
            </select>
          </div>
        )}

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-slate-800 text-slate-300 hover:bg-slate-900 hover:text-white rounded-xl"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCapture}
            disabled={!!error || !selectedDevice}
            className="bg-gradient-to-r from-teal-600 to-teal-400 hover:from-teal-700 hover:to-teal-500 text-white rounded-xl px-6"
          >
            Capture Photo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
