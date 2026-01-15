//  This code is GPT generated code with some changes.

import { useEffect, useState } from "react";
import axios from "axios";

export const useFetchTotalFailsLowest = (id: string | null) => {
	const [data, setData] = useState<{ professor: string; totalFail: number }[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!id) return;

		const fetchData = async () => {
			setLoading(true);
			setError(null);

			try {
				const response = await axios.get(`http://localhost:4321/totalFails/${id}`);
				const result = response.data.result || [];

				const formattedData = result
					.filter((item: any) => item[`${id}_instructor`]) // Exclude empty instructors
					.map((item: any) => ({
						professor: item[`${id}_instructor`],
						totalFail: item.totalFail,
					}))
					.slice(0, 10);

				setData(formattedData);
			} catch (err: any) {
				setError(err.response?.data?.error || "Failed to fetch data.");
			} finally {
				setLoading(false);
			}
		};

		fetchData();
	}, [id]);

	return { data, loading, error };
};
