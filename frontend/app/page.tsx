"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList } from "@/components/ui/breadcrumb";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { First } from "@/components/First";
import { Second } from "@/components/Second";
import { Fourth } from "@/components/Fourth";
import { useState } from "react";
import { DatasetProvider } from "@/context/DatasetContext";
import { Last } from "@/components/last";

export default function App() {
	const [datasetID, setDatasetId] = useState<string | null>(null);
	const [darkMode, setDarkMode] = useState(true);

	const changeTheme = () => {
		setDarkMode(!darkMode);
		document.documentElement.classList.toggle("dark", !darkMode);
	};

	return (
		<div className={darkMode ? "dark bg-gray-900 text-gray-100" : "bg-gray-100 text-gray-900"}>
			<DatasetProvider>
				<SidebarProvider>
					<SidebarInset>
						<header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 dark:border-gray-700">
							<Breadcrumb>
								<BreadcrumbList>
									<BreadcrumbItem className="hidden md:block">
										<BreadcrumbLink href="#">{datasetID || "No Dataset Selected"}</BreadcrumbLink>
									</BreadcrumbItem>
								</BreadcrumbList>
							</Breadcrumb>
							<button
								onClick={changeTheme}
								className="ml-auto px-4 py-2 text-sm font-medium bg-gray-300 rounded dark:bg-gray-700"
							>
								Toggle {darkMode ? "Light" : "Dark"} Mode
							</button>
							<SidebarTrigger className="-mr-1 ml-auto rotate-180" />
						</header>
						<div className="flex flex-1 flex-col gap-4 p-4">
							{!datasetID ? (
								<div className="flex flex-col items-center justify-center h-[80vh] bg-gray-200 dark:bg-gray-800 rounded-lg text-gray-600 dark:text-gray-400">
									<p className="text-xl font-semibold">Upload or Select a Dataset</p>
								</div>
							) : (
								<>
									<div className="min-h-[100vh] flex-1 rounded-xl md:min-h-min">
										<First currID={datasetID} />
									</div>
									<div className="min-h-[100vh] flex-1 rounded-xl md:min-h-min">
										<Second currID={datasetID} />
									</div>
									<div className="min-h-[100vh] flex-1 rounded-xl md:min-h-min">
										<Fourth currID={datasetID} />
									</div>
									<div className="min-h-[100vh] flex-1 rounded-xl md:min-h-min">
										<Last currID={datasetID} />
									</div>
								</>
							)}
						</div>
					</SidebarInset>
					<AppSidebar currID={datasetID || ""} setCurrID={setDatasetId} side="right" />
				</SidebarProvider>
			</DatasetProvider>
		</div>
	);
}
