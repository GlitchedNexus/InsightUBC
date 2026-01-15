// This component was developed using ChatGPT to ensure consistent state management with some modifications.

import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

interface DatasetContextType {
	datasets: { id: string }[];
	refreshDatasets: () => Promise<void>;
	removeDataset: (id: string) => Promise<void>;
}

const DatasetContext = createContext<DatasetContextType | undefined>(undefined);

export const DatasetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const [datasets, setDatasets] = useState<{ id: string }[]>([]);

	const fetchDatasets = async () => {
		try {
			const response = await axios.get("http://localhost:4321/datasets");
			const result = response.data.result || [];
			setDatasets(result.map((dataset: { id: string }) => ({ id: dataset.id })));
		} catch (err) {
			console.error("Failed to fetch datasets:", err);
		}
	};

	const removeDataset = async (id: string) => {
		try {
			await axios.delete(`http://localhost:4321/dataset/${id}`);
			await fetchDatasets();
		} catch (err) {
			console.error(`Failed to remove dataset ${id}:`, err);
		}
	};

	useEffect(() => {
		fetchDatasets();
	}, []);

	return (
		<DatasetContext.Provider value={{ datasets, refreshDatasets: fetchDatasets, removeDataset }}>
			{children}
		</DatasetContext.Provider>
	);
};

export const useDatasetContext = () => {
	const context = useContext(DatasetContext);
	if (!context) {
		throw new Error("useDatasetContext must be used within a DatasetProvider");
	}
	return context;
};
