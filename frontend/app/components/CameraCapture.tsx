"use client";

import React, { useEffect, useRef, useState } from "react";

export interface FaceData {
  box: [number, number, number, number];
  match: { user_id: string; name: string } | null;
  confidence?: number;
}

interface CameraCaptureProps {
  onCapture: (dataUrl: string) => void;
  captureIntervalMs?: number | null;
  singleShot?: boolean;
  isLiveMode?: boolean;
  facesData?: FaceData[];
}

const CameraCapture: React.FC<CameraCaptureProps> = ({
  onCapture,
  captureIntervalMs = null,
  singleShot = false,
  isLiveMode = false,
  facesData = [],
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const captureInFlightRef = useRef(false);
  const [cameraStatus, setCameraStatus] = useState<"loading" | "active" | "stopped">("stopped");
  const [cameraError, setCameraError] = useState<string>("");

  const startCamera = async () => {
    try {
      setCameraStatus("loading");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
      });
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraError("");
      setCameraStatus("active");
    } catch (err) {
      console.error("Camera error:", err);
      setCameraError("Unable to access the camera. Check permissions or connect a camera and try again.");
      setCameraStatus("stopped");
    }
  };

  const stopCamera = () => {
    const stream = videoRef.current?.srcObject as MediaStream;
    stream?.getTracks().forEach((track) => track.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    if (intervalRef.current) clearInterval(intervalRef.current);
    setCameraStatus("stopped");
  };

  const capture = () => {
    const video = videoRef.current;
    const canvas = captureCanvasRef.current;
    if (!video || !canvas || cameraStatus !== "active" || captureInFlightRef.current) return;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    captureInFlightRef.current = true;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
    onCapture(dataUrl);
    window.setTimeout(() => {
      captureInFlightRef.current = false;
    }, 250);
  };

  useEffect(() => {
    if (singleShot || isLiveMode) startCamera();
    return () => stopCamera();
  }, [singleShot, isLiveMode]);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = overlayCanvasRef.current;
    if (!video || !canvas || cameraStatus !== "active") {
      return;
    }

    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    ctx.clearRect(0, 0, width, height);
    facesData.forEach((face) => {
      const [x, y, w, h] = face.box;
      const known = Boolean(face.match);
      ctx.strokeStyle = known ? "#10b981" : "#ef4444";
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, w, h);
      ctx.fillStyle = known ? "#10b981" : "#ef4444";
      ctx.font = "600 15px sans-serif";
      ctx.fillText(
        known ? `${face.match?.name} ${face.confidence ? `• ${face.confidence}%` : ""}` : "Unknown face",
        x,
        Math.max(20, y - 10)
      );
    });
  }, [facesData, cameraStatus]);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (captureIntervalMs && isLiveMode && cameraStatus === "active") {
      intervalRef.current = setInterval(capture, captureIntervalMs);
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [captureIntervalMs, isLiveMode, cameraStatus]);

  return (
    <div className="relative w-full">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className={`w-full rounded-[28px] border border-slate-200 bg-slate-950 object-cover shadow-xl shadow-slate-900/10 ${cameraStatus === "active" ? "block" : "hidden"}`}
        style={{ maxHeight: "420px" }}
      />
      <canvas ref={overlayCanvasRef} className="pointer-events-none absolute left-0 top-0 w-full rounded-[28px]" />
      <canvas ref={captureCanvasRef} className="hidden" />
      {cameraStatus === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center rounded-[28px] bg-slate-950/60 backdrop-blur-sm">
          <div className="rounded-2xl bg-white/95 px-5 py-4 text-sm font-medium text-slate-700 shadow-lg">
            Starting camera...
          </div>
        </div>
      )}
      {cameraStatus === "stopped" && !cameraError && (
        <button
          onClick={startCamera}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-lg"
        >
          Start Camera
        </button>
      )}
      {cameraError && (
        <div className="absolute inset-0 flex items-center justify-center rounded-[28px] bg-white/90 p-6 text-center">
          <div className="max-w-xs space-y-3">
            <p className="text-sm font-medium text-rose-700">{cameraError}</p>
            <button
              onClick={startCamera}
              className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Retry Camera
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CameraCapture;
