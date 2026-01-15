import React, { useState } from "react";
import {
	Sidebar,
	SidebarContent,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
	SidebarRail,
} from "@/components/ui/sidebar";
import { useDatasetContext } from "@/context/DatasetContext";
import UploadDatasetButton from "./UploadButton";
import { Dialog, DialogContent, DialogFooter, DialogTitle } from "./ui/dialog";
import { Button } from "@/components/ui/button";

export function AppSidebar({
	currID,
	setCurrID,
	...props
}: { currID: string; setCurrID: (id: string) => void } & React.ComponentProps<typeof Sidebar>) {
	const { datasets, removeDataset } = useDatasetContext();
	const [isVisible, setIsVisible] = useState(false);
	const [toRemove, setToRemove] = useState<string | null>(null);

	const handleRemove = async () => {
		if (toRemove) {
			await removeDataset(toRemove);
			if (currID === toRemove) {
				setCurrID("");
			}
			setToRemove(null);
			setIsVisible(false);
		}
	};

	const confirmRemove = (id: string) => {
		setToRemove(id);
		setIsVisible(true);
	};

	return (
		<>
			<Sidebar {...props}>
				<SidebarContent>
					<SidebarGroup>
						<SidebarGroupLabel>Table of Contents</SidebarGroupLabel>
						<SidebarGroupContent>
							<SidebarMenu>
								<SidebarMenuItem key="datasets">
									<SidebarMenuButton asChild>
										<span className="font-medium">Datasets</span>
									</SidebarMenuButton>
									{datasets.length ? (
										<SidebarMenuSub>
											{datasets.map((item) => (
												<SidebarMenuSubItem key={item.id}>
													<SidebarMenuSubButton
														asChild
														isActive={item.id === currID}
														onClick={() => setCurrID(item.id)}
													>
														<span>{item.id}</span>
													</SidebarMenuSubButton>
													<button className="text-red-500 ml-4" onClick={() => confirmRemove(item.id)}>
														Remove
													</button>
												</SidebarMenuSubItem>
											))}
										</SidebarMenuSub>
									) : (
										<p>No datasets available.</p>
									)}
								</SidebarMenuItem>
							</SidebarMenu>
						</SidebarGroupContent>
					</SidebarGroup>
					<SidebarGroup>
						<UploadDatasetButton />
					</SidebarGroup>
				</SidebarContent>
				<SidebarRail />
			</Sidebar>

			<Dialog open={isVisible} onOpenChange={setIsVisible}>
				<DialogContent>
					<DialogTitle>Confirm Removal</DialogTitle>
					<p>Are you sure you want to remove the dataset "{toRemove}"?</p>
					<DialogFooter>
						<Button variant="outline" onClick={() => setIsVisible(false)}>
							Cancel
						</Button>
						<Button variant="destructive" onClick={handleRemove}>
							Remove
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
