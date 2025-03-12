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
    const [loading, setLoading] = useState<boolean>(false);
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    // const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    //     if (event.target.files && event.target.files.length > 0) {
    //         setSelectedFile(event.target.files[0]);
    //     }
    // };
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files.length > 0) {
            const file = event.target.files[0];
            setSelectedFile(file);

            // Generate a preview URL for the image
            const previewUrl = URL.createObjectURL(file);
            setImagePreview(previewUrl);
        }
    };

    const handleUpload = async () => {
        if (!selectedFile) {
            setError("Please select a file to upload.");
            return;
        }

        setLoading(true);
        setError(null);

        const formData = new FormData();
        formData.append("file", selectedFile);

        // Minimum loading time (e.g., 2 seconds)
        const minimumLoadingTime = new Promise((resolve) => setTimeout(resolve, 2000));

        try {
            const fetchPrediction = fetch("http://localhost:3000/upload", {
                method: "POST",
                body: formData,
            }).then(async (response) => {
                if (!response.ok) {
                    throw new Error("Failed to upload file");
                }
                return response.json();
            });

            const [data] = await Promise.all([fetchPrediction, minimumLoadingTime]); // Wait for both API response & minimum loading time

            setPrediction(data.predictionData);
        } catch (err) {
            setError("Error uploading file. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-300 p-4">
            <div className="border-2 border-black border-dashed flex flex-col px-10 py-5 rounded-2xl max-w-[30rem]">
                <h1 className="text-4xl font-bold mb-4 text-center">Cancer Detection</h1>
                {/* <input type="file" accept="image/*" onChange={handleFileChange} className="mb-4 bg-gray-400 p-2 rounded-lg" /> */}
                <div className="flex flex-col items-center">
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="mb-4 bg-gray-400 p-2 rounded-lg"
                    />

                    {imagePreview && (
                        <div className="mb-4">
                            <p className="text-gray-700 font-medium">Image Preview:</p>
                            <img
                                src={imagePreview}
                                alt="Selected Preview"
                                className="mt-2 w-64 h-64 object-cover rounded-lg border-2 border-gray-500 shadow-md"
                            />
                        </div>
                    )}
                </div>


                <button
                    onClick={handleUpload}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg cursor-pointer flex items-center justify-center"
                    disabled={loading}
                >
                    {loading ? (
                        <div className="w-5 h-5 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                        "Upload & Predict"
                    )}
                </button>
            </div>

            {error && <p className="text-red-500 mt-2">{error}</p>}

            {loading && (
                <div className="mt-4 p-4 bg-white shadow-md rounded-lg border-2 border-black">
                    <p className="text-blue-500 font-semibold">Processing... Please wait.</p>
                </div>
            )}
            {prediction && !loading && (
                <div className="mt-5 bg-white shadow-lg border border-gray-300 rounded-xl p-6 max-w-lg w-full text-gray-800">
                    <h2 className="text-xl font-bold text-center text-gray-900 mb-4">
                        🩺 Cancer Detection Result
                    </h2>

                    <div className="flex flex-col gap-3">
                        <div className="flex justify-between items-center">
                            <p className="text-lg font-semibold">Prediction:</p>
                            <span
                                className={`px-3 py-1 rounded-full text-sm font-medium
                        ${prediction.prediction === "Malignant" ? "bg-red-500 text-white" : "bg-green-500 text-white"}
                    `}
                            >
                                {prediction.prediction}
                            </span>
                        </div>

                        <div>
                            <p className="text-lg font-semibold mb-1">Confidence:</p>
                            <div className="w-full bg-gray-200 rounded-full h-4">
                                <div
                                    className={`h-4 rounded-full ${prediction.confidence > 0.7 ? "bg-blue-500" : "bg-yellow-500"}`}
                                    style={{ width: `${(prediction.confidence * 100).toFixed(2)}%` }}
                                ></div>
                            </div>
                            <p className="text-sm text-gray-600 mt-1 text-right">
                                {(prediction.confidence * 100).toFixed(2)}%
                            </p>
                        </div>

                        <div className="flex justify-between">
                            <p className="text-lg font-semibold">Status:</p>
                            <p className="font-medium text-gray-700">{prediction.status}</p>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default CancerDetection;
