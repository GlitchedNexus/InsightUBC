export default class Room {
	private fullname: string;
	private shortname: string;
	private number: string;
	private name: string;
	private address: string;
	private lat: number;
	private lon: number;
	private seats: number;
	private type: string;
	private furniture: string;
	private href: string;

	public constructor(
		fullname: string,
		shortname: string,
		number: string,
		name: string,
		address: string,
		lat: number,
		lon: number,
		seats: number,
		type: string,
		furniture: string,
		href: string
	) {
		this.fullname = fullname;
		this.shortname = shortname;
		this.number = number;
		this.name = name;
		this.address = address;
		this.lat = lat;
		this.lon = lon;
		this.seats = seats;
		this.type = type;
		this.furniture = furniture;
		this.href = href;
	}

	public getParam(name: string): string | number | undefined {
		switch (name) {
			case "fullname":
				return this.fullname;
			case "shortname":
				return this.shortname;
			case "number":
				return this.number;
			case "name":
				return this.name;
			case "address":
				return this.address;
			case "lat":
				return this.lat;
			case "lon":
				return this.lon;
			case "seats":
				return this.seats;
			case "type":
				return this.type;
			case "furniture":
				return this.furniture;
			case "href":
				return this.href;
		}
		return undefined;
	}
}
