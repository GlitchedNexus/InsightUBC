import React, { useState } from "react";
import axios from "axios";

import { useDatasetContext } from "@/context/DatasetContext";
import { Dialog, DialogContent, DialogFooter, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger } from "./ui/select";

export enum InsightDatasetKind {
	Sections = "sections",
	Rooms = "rooms",
}

export default function UploadDatasetButton() {
	const [datasetID, setDatasetID] = useState("");
	const [kind, setKind] = useState<InsightDatasetKind>(InsightDatasetKind.Sections);
	const [file, setFile] = useState<File | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);
	const [isDialogOpen, setIsDialogOpen] = useState(false);

	const { refreshDatasets } = useDatasetContext();

	const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		if (event.target.files && event.target.files.length > 0) {
			setFile(event.target.files[0]);
		}
	};

	// This submit request was generated using GPT with modifications.
	const handleSubmit = async () => {
		if (!datasetID || !file) {
			setError("Please provide a dataset ID and a zip file.");
			return;
		}

		const url = `http://localhost:4321/dataset/${datasetID}/${kind}`;

		try {
			const fileBuffer = await file.arrayBuffer();
			await axios.put(url, fileBuffer, {
				headers: {
					"Content-Type": "application/octet-stream",
				},
			});
			setSuccess(`Dataset uploaded successfully.`);
			setError(null);
			await refreshDatasets();
			setDatasetID("");
			setKind(InsightDatasetKind.Sections);
			setFile(null);
			setIsDialogOpen(false);
			setSuccess(null);
		} catch (err: any) {
			setError(err.response?.data?.error || "An error occurred while uploading.");
			setSuccess(null);
		}
	};

	return (
		<Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
			<DialogTrigger asChild>
				<Button onClick={() => setIsDialogOpen(true)}>Upload Dataset</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogTitle>Upload Dataset</DialogTitle>
				<div className="space-y-4">
					<Input placeholder="Dataset ID" value={datasetID} onChange={(e) => setDatasetID(e.target.value)} />
					<Select value={kind} onValueChange={(value: string) => setKind(value as InsightDatasetKind)}>
						<SelectTrigger>
							<span>{kind === InsightDatasetKind.Sections ? "Sections" : "Rooms"}</span>
						</SelectTrigger>
						<SelectContent>
							<SelectItem value={InsightDatasetKind.Sections}>{InsightDatasetKind.Sections}</SelectItem>
							<SelectItem value={InsightDatasetKind.Rooms}>{InsightDatasetKind.Rooms}</SelectItem>
						</SelectContent>
					</Select>
					<Input type="file" accept=".zip" onChange={handleFileChange} />
				</div>
				{error && <p className="text-red-500">{error}</p>}
				{success && <p className="text-green-500">{success}</p>}
				<DialogFooter>
					<Button onClick={handleSubmit}>Submit</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
