// This code is GPT generated code with some changes.

import { useEffect, useState } from "react";
import axios from "axios";

export const useFetchCpscAvg = (id: string | null) => {
	const [data, setData] = useState([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!id) return;

		const fetchData = async () => {
			setLoading(true);
			setError(null);

			try {
				const response = await axios.get(`http://localhost:4321/cpscAvg/${id}`);
				console.log(response.data.result);
				setData(response.data.result || []);
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
