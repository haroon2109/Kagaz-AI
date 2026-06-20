import React, { useState } from 'react';
import axios from 'axios';

export default function WorksheetGrader() {
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post("http://localhost:8000/api/grade", formData);
      
      // Crucial: You must update the state with the raw array returned from the backend!
      if (response.data && response.data.results) {
        setAnswers(response.data.results); 
      }
    } catch (error) {
      console.error("Upload failed", error);
      alert("Network error communicating with the grading engine.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <input type="file" onChange={handleFileUpload} accept="image/*" className="mb-4" />
      
      {loading && <p className="text-blue-500 animate-pulse">Analyzing handwriting patterns...</p>}

      <div className="mt-4 space-y-4">
        {answers.map((answer) => (
          <div key={answer.id} className="border p-4 my-2 rounded bg-white shadow-sm">
            {/* Use answer.question instead of old hardcoded mock string properties */}
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
