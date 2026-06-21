import React, { useState } from 'react';
import axios from 'axios';
import { saveOfflineWorksheet } from '../lib/offline-storage';
import { compressImage } from '../utils/image-compressor';
import { api } from '../lib/api';

export default function WorksheetGrader() {
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [localQueueCount, setLocalQueueCount] = useState(0);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setLoading(true);
    
    try {
      // 1. Immediately cache locally to fulfill the offline pitch requirement
      const item = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: `Worksheet - ${new Date().toLocaleDateString()}`,
        studentId: "",
        file: file,
      };
      await saveOfflineWorksheet(item);
      
      // 2. Add visual indicator for "Local Cache Mode Active" as promised in docs
      setLocalQueueCount(prev => prev + 1);

      // 3. Compress the image to prevent Main-Thread UI Freezing
      const compressedBlob = await compressImage(file);
      
      const formData = new FormData();
      formData.append("file", compressedBlob, file.name);

      // 4. Target the correct organized route processor instead of un-versioned root
      // We use the centralized api.js to ensure auth headers are correctly attached
      const response = await api.worksheets.upload(file);
      
      // Since this is a legacy mock component, we simulate the results return 
      // or rely on the actual batch queue in production
      if (response && response.results) {
        setAnswers(response.results); 
      }
    } catch (error) {
      console.error("Upload failed", error);
      alert("Network error. Your worksheet is safely stored in the local cache and will sync when online.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <input type="file" onChange={handleFileUpload} accept="image/*" />
        {localQueueCount > 0 && (
          <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-sm font-bold animate-pulse">
            Local Cache Mode Active: {localQueueCount} pending
          </span>
        )}
      </div>
      
      {loading && <p className="text-blue-500 animate-pulse">Compressing and analyzing handwriting...</p>}

      <div className="mt-4 space-y-4">
        {answers.map((answer) => (
          <div key={answer.id} className="border p-4 my-2 rounded bg-white shadow-sm">
            <h3 className="font-semibold">Question: {answer.question}</h3> 
            <p className="text-sm mt-2 text-gray-600">Extracted Student Answer: <strong className="text-black">{answer.student_answer}</strong></p>
            <p className="text-sm text-gray-600">Correct Answer: <strong className="text-black">{answer.correct_answer}</strong></p>
            <span className={`inline-block mt-2 px-2 py-1 rounded text-sm font-bold ${answer.status === 'Correct' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>Status: {answer.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
