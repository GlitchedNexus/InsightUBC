"use client";

import * as React from "react";
import { Pie, PieChart, Sector, Label } from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartStyle, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AvgCountData, useFetchAvgCount } from "@/hooks/useFetchAvgCount";
import { PieSectorDataItem } from "recharts/types/polar/Pie";

export function Last({ currID }: { currID: string | null }) {
	const { data, loading, error } = useFetchAvgCount(currID);

	const COLORS = [
		"#0088FE",
		"#00C49F",
		"#FFBB28",
		"#FF8042",
		"#A28DFF",
		"#FF668D",
		"#D0ED57",
		"#8884D8",
		"#82CA9D",
		"#FF69B4",
		"#6A5ACD",
		"#FF4500",
		"#2E8B57",
		"#1E90FF",
		"#FFD700",
		"#DC143C",
		"#00FA9A",
		"#FF6347",
		"#8B008B",
		"#556B2F",
		"#8FBC8F",
		"#483D8B",
		"#2E8B57",
		"#DAA520",
		"#B22222",
		"#FFFAF0",
		"#F0E68C",
		"#D2691E",
		"#CD5C5C",
		"#2F4F4F",
	];

	const chartData = React.useMemo(
		() =>
			data.map((item: AvgCountData) => ({
				department: item[`${currID}_dept`],
				total: item.total,
				fill: COLORS[data.indexOf(item) % COLORS.length],
			})),
		[data]
	);

	//  Used CPT to heklp congifure the chartdata into format that could be used by the PieChart
	const chartConfig: { [key: string]: { label: string; color: string } } = React.useMemo(
		() =>
			chartData.reduce((acc, item, index) => {
				if (!item.department) return acc;
				return {
					...acc,
					[item.department]: {
						label: item.department.toUpperCase(),
						color: COLORS[index % COLORS.length],
					},
				};
			}, {}),
		[chartData]
	);

	const id = "pie-interactive";
	const [active, setActive] = React.useState(chartData[0]?.department || "");

	const activeIndex = React.useMemo(
		() => chartData.findIndex((item) => item.department === active),
		[active, chartData]
	);

	const departments = React.useMemo(() => chartData.map((item) => item.department), [chartData]);

	// GPT generated Error handling and loading states
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
		<Card data-chart={id} className="flex flex-col">
			<ChartStyle id={id} config={chartConfig} />
			<CardHeader className="flex-row items-start space-y-0 pb-0">
				<div className="grid gap-1">
					<CardTitle>Department Total Counts</CardTitle>
					<CardDescription>Distribution of total sections by department</CardDescription>
				</div>
				<Select value={active} onValueChange={setActive}>
					<SelectTrigger className="ml-auto h-7 w-[150px] rounded-lg pl-2.5" aria-label="Select a department">
						<SelectValue placeholder="Select department" />
					</SelectTrigger>
					<SelectContent align="end" className="rounded-xl">
						{departments.map((key) => (
							<SelectItem key={key} value={key} className="rounded-lg [&_span]:flex">
								<div className="flex items-center gap-2 text-xs">
									<span
										className="flex h-3 w-3 shrink-0 rounded-sm"
										style={{
											backgroundColor: COLORS[chartData.findIndex((item) => item.department === key) % COLORS.length],
										}}
									/>
									{chartConfig[key]?.label}
								</div>
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</CardHeader>
			<CardContent className="flex flex-1 justify-center pb-0">
				<ChartContainer id={id} config={chartConfig} className="mx-auto aspect-square w-full max-w-[300px]">
					<PieChart>
						<ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
						<Pie
							data={chartData}
							dataKey="total"
							nameKey="department"
							innerRadius={60}
							strokeWidth={5}
							activeIndex={activeIndex}
							activeShape={({ outerRadius = 0, ...props }: PieSectorDataItem) => (
								<g>
									<Sector {...props} outerRadius={outerRadius + 10} />
									<Sector {...props} outerRadius={outerRadius + 25} innerRadius={outerRadius + 12} />
								</g>
							)}
						>
							<Label
								content={({ viewBox }) => {
									if (viewBox && "cx" in viewBox && "cy" in viewBox) {
										return (
											<text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
												<tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-3xl font-bold">
													{chartData[activeIndex]?.total.toLocaleString()}
												</tspan>
												<tspan x={viewBox.cx} y={(viewBox.cy || 0) + 24} className="fill-muted-foreground">
													Sections
												</tspan>
											</text>
										);
									}
								}}
							/>
						</Pie>
					</PieChart>
				</ChartContainer>
			</CardContent>
		</Card>
	);
}
