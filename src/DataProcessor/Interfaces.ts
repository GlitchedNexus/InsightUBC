export interface Cur {
	id: string;
	Course: string;
	Title: string;
	Professor: string;
	Subject: string;
	Year: number;
	Avg: number;
	Pass: number;
	Fail: number;
	Audit: number;
	Section: string;
}

export interface BuildingInfo {
	title?: string;
	link?: string;
	code?: string;
	address?: string;
}

export interface RoomData {
	roomNumber?: string;
	roomLink?: string;
	capacity?: string;
	furnitureType?: string;
	roomType?: string;
	building?: string;
	buildingLink?: string;
	buildingAddress?: string;
	buildingCode?: string;
	latitude?: number;
	longitude?: number;
}

export interface GeoResponse {
	lat?: number;
	lon?: number;
	error?: string;
}
