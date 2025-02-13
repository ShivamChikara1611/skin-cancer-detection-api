/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState } from "react";

interface PredictionResponse {
    confidence: number;
    prediction: string;
    status: string;
    timestamp: string;
}

const CancerDetection: React.FC = () => {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [prediction, setPrediction] = useState<PredictionResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files.length > 0) {
            setSelectedFile(event.target.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!selectedFile) {
            setError("Please select a file to upload.");
            return;
        }

        const formData = new FormData();
        formData.append("file", selectedFile);

        try {
            const response = await fetch("http://localhost:3000/upload", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                throw new Error("Failed to upload file");
            }

            const data = await response.json();
            setPrediction(data.predictionData);
            setError(null);
        } catch (err) {
            setError("Error uploading file. Please try again.");
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
            <h1 className="text-2xl font-bold mb-4">Cancer Detection</h1>
            <input type="file" accept="image/*" onChange={handleFileChange} className="mb-4" />
            <button onClick={handleUpload} className="px-4 py-2 bg-blue-500 text-white rounded-lg">
                Upload & Predict
            </button>
            {error && <p className="text-red-500 mt-2">{error}</p>}
            {prediction && (
                <div className="mt-4 p-4 bg-white shadow-md rounded-lg">
                    <p><strong>Prediction:</strong> {prediction.prediction}</p>
                    <p><strong>Confidence:</strong> {prediction.confidence.toFixed(4)}</p>
                    <p><strong>Status:</strong> {prediction.status}</p>
                    <p><strong>Timestamp:</strong> {new Date(prediction.timestamp).toLocaleString()}</p>
                </div>
            )}
        </div>
    );
};

export default CancerDetection;
