export default class Section {
	private uuid: string;
	private id: string;
	private title: string;
	private instructor: string;
	private dept: string;
	private year: number;
	private avg: number;
	private pass: number;
	private fail: number;
	private audit: number;

	public constructor(
		uuid: string,
		id: string,
		title: string,
		instructor: string,
		dept: string,
		year: number,
		avg: number,
		pass: number,
		fail: number,
		audit: number
	) {
		this.uuid = uuid;
		this.id = id;
		this.title = title;
		this.instructor = instructor;
		this.dept = dept;
		this.year = year;
		this.avg = avg;
		this.pass = pass;
		this.fail = fail;
		this.audit = audit;
	}

	public getParam(name: string): string | number | undefined {
		switch (name) {
			case "uuid":
				return this.uuid;
			case "id":
				return this.id;
			case "title":
				return this.title;
			case "instructor":
				return this.instructor;
			case "dept":
				return this.dept;
			case "year":
				return this.year;
			case "avg":
				return this.avg;
			case "pass":
				return this.pass;
			case "fail":
				return this.fail;
			case "audit":
				return this.audit;
		}
		return undefined;
	}
}
