"use client";

import React from "react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { useFetchCpscAvg } from "@/hooks/useFetchCpscAvg";

export function First({ currID }: { currID: string | null }) {
	const { data, loading, error } = useFetchCpscAvg(currID);

	const chartConfig = {
		avgGrade: {
			label: "Average Grade",
			color: "hsl(var(--chart-1))",
		},
	};

	const chartData = React.useMemo(
		() =>
			data.map((item) => ({
				year: item[`${currID}_year`],
				avgGrade: item.avgGrade,
			})),
		[data, currID]
	);

	// Error checks implemented using GPT
	if (!currID) {
		return (
			<Card className="flex items-center justify-center h-[250px] bg-gray-100">
				<CardTitle>Please select or upload a dataset</CardTitle>
			</Card>
		);
	}

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

	if (!Array.isArray(chartData) || chartData.length === 0) {
		return (
			<Card className="flex items-center justify-center h-[250px] bg-gray-400 text-gray-600">
				<CardTitle>No data available</CardTitle>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader className="flex flex-col items-stretch space-y-0 border-b p-0 sm:flex-row">
				<div className="flex flex-1 flex-col justify-center gap-1 px-6 py-5 sm:py-6">
					<CardTitle>Average Grades - {currID}</CardTitle>
					<CardDescription>Average grades across CPSC courses over the years</CardDescription>
				</div>
			</CardHeader>
			<CardContent className="px-2 sm:p-6">
				<ChartContainer className="aspect-auto h-[250px] w-full" config={chartConfig}>
					<LineChart
						data={chartData}
						margin={{
							left: 12,
							right: 12,
							bottom: 12,
						}}
					>
						<CartesianGrid vertical={false} />
						<XAxis
							dataKey="year"
							tickLine={false}
							axisLine={false}
							tickMargin={8}
							minTickGap={32}
							label={{ value: "Year", position: "insideBottom", offset: -5 }}
						/>
						<YAxis
							tickLine={false}
							axisLine={false}
							tickFormatter={(value) => Number(value).toFixed(1)}
							label={{ value: "Average Grade", angle: -90, position: "insideLeft", offset: -5 }}
						/>
						<ChartTooltip
							content={
								<ChartTooltipContent
									className="w-[150px]"
									nameKey="avgGrade"
									labelFormatter={(value) => `Year: ${value}`}
									formatter={(value) => (typeof value === "number" ? `${value.toFixed(2)}%` : `${value}`)}
								/>
							}
						/>
						<Line dataKey="avgGrade" type="monotone" stroke={chartConfig.avgGrade.color} strokeWidth={2} dot={false} />
					</LineChart>
				</ChartContainer>
			</CardContent>
		</Card>
	);
}
