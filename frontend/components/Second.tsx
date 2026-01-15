"use client";

import { Bar, BarChart, XAxis, YAxis, LabelList } from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { useFetchTotalFailsLowest } from "@/hooks/useFetchTotalFailsLowest";

export function Second({ currID }: { currID: string }) {
	const { data, loading, error } = useFetchTotalFailsLowest(currID);

	const chartConfig = {
		totalFail: {
			label: "Total Failures",
			color: "hsl(var(--chart-1))",
		},
	};

	// Error checks implemented using GPT
	if (loading) {
		return (
			<Card className="flex items-center justify-center h-[250px] bg-gray-100">
				<CardTitle>Loading data...</CardTitle>
			</Card>
		);
	}

	if (error) {
		return (
			<Card className="flex items-center justify-center h-[250px] bg-gray-100">
				<CardTitle>Error: {error}</CardTitle>
			</Card>
		);
	}

	if (!Array.isArray(data) || data.length === 0) {
		return (
			<Card className="flex items-center justify-center h-[250px] bg-gray-400 text-gray-600">
				<CardTitle>No data available</CardTitle>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>Top 10 Professors - Lowest Total Fails</CardTitle>
				<CardDescription>Across all sections</CardDescription>
			</CardHeader>
			<CardContent>
				<ChartContainer config={chartConfig}>
					<BarChart
						accessibilityLayer
						data={data}
						layout="vertical"
						margin={{
							left: 0,
						}}
					>
						<YAxis dataKey="professor" type="category" tickLine={false} tickMargin={10} axisLine={false} />
						<XAxis
							dataKey="totalFail"
							type="number"
							tickFormatter={(value) => (typeof value === "number" ? value.toString() : "0")}
							axisLine={false}
							tickLine={false}
						/>
						<ChartTooltip
							cursor={false}
							content={
								<ChartTooltipContent
									hideLabel
									formatter={(value) => (typeof value === "number" ? `${value} failures` : `${value}`)}
								/>
							}
						/>
						<Bar dataKey="totalFail" fill={chartConfig.totalFail.color} layout="vertical" radius={5}>
							<LabelList dataKey="totalFail" position="inside" fill="white" fontSize={12} fontWeight="bold" />
						</Bar>
					</BarChart>
				</ChartContainer>
			</CardContent>
		</Card>
	);
}
