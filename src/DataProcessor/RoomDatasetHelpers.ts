import JSZip from "jszip";
import { BuildingInfo, GeoResponse, RoomData } from "./Interfaces";
import Room from "./Room";
import http from "node:http";
import * as parse5 from "parse5";

const TEAM_NUMBER = "217";

export function returnRoom(allRooms: RoomData[]): Room[] {
	return allRooms.map((roomData) => {
		return new Room(
			roomData.building || "",
			roomData.buildingCode || "",
			roomData.roomNumber || "",
			`${roomData.buildingCode}_${roomData.roomNumber}`,
			roomData.buildingAddress || "",
			roomData.latitude || 0,
			roomData.longitude || 0,
			parseInt(roomData.capacity || "0", 10),
			roomData.roomType || "",
			roomData.furnitureType || "",
			roomData.roomLink || ""
		);
	});
}

// Reference: https://www.youtube.com/watch?v=nSarO7rFmAE
// Use DFS to extract building information from the HTML document
export function getBuildingData(node: any): BuildingInfo[] {
	const results: BuildingInfo[] = [];

	const dfs = (currentNode: any): void => {
		if (!currentNode) {
			return;
		}

		if (currentNode.nodeName === "td") {
			handleBuildingNode(currentNode, results);
		}

		if (currentNode.childNodes) {
			currentNode.childNodes.forEach((childNode: any) => dfs(childNode));
		}
	};

	dfs(node);

	// Basically we will have an extra JSON object with only one code and all the codes for the building
	// will be shifted by one index to the start of the array, so we reformat the array to fix this
	formatBuildingDataArray(results);
	return results;
}

export function handleBuildingNode(node: any, results: BuildingInfo[]): void {
	const classAttr = node.attrs.find((attr: any) => attr.name === "class");

	if (!classAttr) {
		return;
	}

	if (classAttr.value.includes("views-field-title")) {
		const title = extractTitleAndLink(node);
		if (title) {
			results.push(title);
		}
	} else if (classAttr.value.includes("views-field-field-building-code")) {
		const code = node.childNodes[0]?.value?.trim();
		if (code && results.length > 0) {
			results[results.length - 1].code = code;
		}
	} else if (classAttr.value.includes("views-field-field-building-address")) {
		const address = node.childNodes[0]?.value?.trim();
		if (address && results.length > 0) {
			results[results.length - 1].address = address;
		}
	}
}

export function extractTitleAndLink(node: any): BuildingInfo | null {
	const aTag = node.childNodes.find((childNode: any) => childNode.nodeName === "a");
	if (aTag) {
		const hrefAttr = aTag.attrs.find((attr: any) => attr.name === "href");
		const titleText = aTag.childNodes[0]?.value?.trim();
		const hrefLink = hrefAttr?.value;
		if (titleText && hrefLink) {
			return { title: titleText, link: hrefLink };
		}
	}
	return null;
}

export function formatBuildingDataArray(results: BuildingInfo[]): void {
	for (let i = results.length - 1; i > 0; i--) {
		results[i].code = results[i - 1].code;
	}
	if (results.length > 0) {
		results.splice(0, 1);
	}
}

// Reference: https://nodejs.org/api/http.html#http
// Also used GPT to help fix async issues and handle errors
export async function fetchGeolocation(address: string): Promise<GeoResponse | null> {
	return new Promise((resolve) => {
		const encodedAddress = encodeURIComponent(address);
		const url = `http://cs310.students.cs.ubc.ca:11316/api/v1/project_team${TEAM_NUMBER}/${encodedAddress}`;

		http
			.get(url, (res) => {
				let data = "";

				res.on("data", (chunk) => {
					data += chunk;
				});

				res.on("end", () => {
					try {
						const response: GeoResponse = JSON.parse(data);
						if (response.lat && response.lon) {
							resolve({ lat: response.lat, lon: response.lon });
						} else {
							resolve(null);
						}
					} catch {
						resolve(null);
					}
				});

				res.on("error", () => {
					resolve(null);
				});
			})
			.on("error", () => {
				resolve(null);
			});
	});
}

export async function processBuildings(buildingList: BuildingInfo[], contents: JSZip): Promise<RoomData[]> {
	const buildingPromises = buildingList.map(async (building) => {
		const buildingFileName = `campus/discover/buildings-and-classrooms/${building.link?.split("/").pop()}`;
		const buildingFile = contents.file(buildingFileName);

		if (!buildingFile) {
			return [];
		}

		const buildingContent = await buildingFile.async("string");
		const document = parse5.parse(buildingContent);
		return getRoomData(document, building);
	});

	const allRooms = await Promise.all(buildingPromises);
	return allRooms.flat();
}

// Reference: https://www.youtube.com/watch?v=nSarO7rFmAE
// Use DFS to extract room information from the HTML document
export async function getRoomData(node: any, buildingInfo: BuildingInfo): Promise<RoomData[]> {
	const roomData: RoomData[] = [];
	const dfs = async (currentNode: any): Promise<void> => {
		if (!currentNode) {
			return;
		}

		if (currentNode.nodeName === "table" && currentNode.attrs.some((attr: any) => attr.value.includes("views-table"))) {
			await extractTableRows(currentNode, buildingInfo, roomData);
		}

		if (currentNode.childNodes) {
			await Promise.all(currentNode.childNodes.map(async (childNode: any) => dfs(childNode)));
		}
	};

	await dfs(node);
	return roomData;
}

// Reference: https://www.youtube.com/watch?v=nSarO7rFmAE
// The table data cells will be in the table body the thead tag is useless for our purposes
export async function extractTableRows(node: any, buildingInfo: BuildingInfo, roomData: RoomData[]): Promise<void> {
	const tbody = node.childNodes.find((childNode: any) => childNode.nodeName === "tbody");

	if (!tbody) {
		return;
	}

	const rowPromises = tbody.childNodes.map(async (rowNode: any) => {
		if (rowNode.nodeName === "tr") {
			const roomInfo = extractRoomDetails(rowNode, buildingInfo);
			if (roomInfo) {
				const geolocation = await fetchGeolocation(buildingInfo.address || "");
				if (geolocation) {
					roomInfo.latitude = geolocation.lat;
					roomInfo.longitude = geolocation.lon;
				}
				roomData.push(roomInfo);
			}
		}
	});

	await Promise.all(rowPromises);
}

// Reference: https://www.youtube.com/watch?v=nSarO7rFmAE
export function extractRoomDetails(rowNode: any, buildingData: BuildingInfo): RoomData | null {
	const roomData: RoomData = {};

	for (const cellNode of rowNode.childNodes) {
		if (cellNode.nodeName !== "td") {
			continue;
		}

		const classAttr = cellNode.attrs.find((attr: any) => attr.name === "class")?.value;

		if (classAttr) {
			handleCellNode(classAttr, cellNode, roomData);
		}
	}

	if (Object.keys(roomData).length > 0) {
		populateBuildingInfo(roomData, buildingData);
		return roomData;
	}

	return null;
}

function handleCellNode(attribute: string, cell: any, data: RoomData): void {
	switch (attribute) {
		case "views-field views-field-field-room-number":
			handleRoomNumber(cell, data);
			break;
		case "views-field views-field-field-room-capacity":
			data.capacity = cell.childNodes[0]?.value?.trim();
			break;
		case "views-field views-field-field-room-furniture":
			data.furnitureType = cell.childNodes[0]?.value?.trim();
			break;
		case "views-field views-field-field-room-type":
			data.roomType = cell.childNodes[0]?.value?.trim();
			break;
	}
}

function handleRoomNumber(cell: any, data: RoomData): void {
	const roomLinkNode = cell.childNodes.find((node: any) => node.nodeName === "a");
	const roomNumber = roomLinkNode?.childNodes[0]?.value?.trim();
	const roomLink = roomLinkNode?.attrs.find((attr: any) => attr.name === "href")?.value;
	if (roomNumber && roomLink) {
		data.roomNumber = roomNumber;
		data.roomLink = roomLink;
	}
}

function populateBuildingInfo(roomInfo: RoomData, buildingInfo: BuildingInfo): void {
	roomInfo.building = buildingInfo.title;
	roomInfo.buildingLink = `http://students.ubc.ca${buildingInfo.link?.replace("./campus", "")}`;
	roomInfo.buildingAddress = buildingInfo.address;
	roomInfo.buildingCode = buildingInfo.code;
}
