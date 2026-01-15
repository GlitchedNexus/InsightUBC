/**
 * This file contains the implementation for the
 * filter class
 */
import Section from "../DataProcessor/Section";
import Room from "../DataProcessor/Room";
import { InsightError } from "../controller/IInsightFacade";

export enum FilterType {
	AND = "AND",
	OR = "OR",
	NOT = "NOT",
	REG = "REG",
	TOP = "TOP",
}

export enum FilterKey {
	IS = "IS",
	GT = "GT",
	EQ = "EQ",
	LT = "LT",
	NA = "NA",
}

export class Filter {
	private type: FilterType;
	private key: FilterKey;
	private sectionKey: string;
	private limit: number;
	private match: string;
	private filterList: Filter[];

	public constructor(type: FilterType, key: FilterKey, sectionKey: string, limit: number, match: string) {
		this.type = type;
		this.key = key;
		this.sectionKey = sectionKey;
		this.limit = limit;
		this.match = match;
		this.filterList = [];
	}

	public pushFilterList(filter: Filter): boolean {
		this.filterList.push(filter);
		return true;
	}

	public filterALL(s: Section | Room): boolean {
		let ret: boolean;
		switch (this.type) {
			case FilterType.AND:
				ret = this.filterAND(s);
				break;
			case FilterType.OR:
				ret = this.filterOR(s);
				break;
			case FilterType.NOT:
				ret = this.filterNOT(s);
				break;
			case FilterType.REG:
				ret = this.filterREG(s);
				break;
			case FilterType.TOP:
				if (this.filterList.length === 0) {
					ret = true;
				} else {
					ret = this.filterAND(s);
				}
				break;
		}
		return ret;
	}

	private filterAND(s: Section | Room): boolean {
		let ret = true;
		this.filterList.forEach((filter) => {
			if (!filter.filterALL(s)) {
				ret = false;
			}
		});
		return ret;
	}

	private filterOR(s: Section | Room): boolean {
		let ret = false;
		this.filterList.forEach((filter) => {
			if (filter.filterALL(s)) {
				ret = true;
			}
		});
		return ret;
	}

	private filterNOT(s: Section | Room): boolean {
		let ret = false;
		this.filterList.forEach((filter) => {
			if (!filter.filterALL(s)) {
				ret = true;
			}
		});
		return ret;
	}

	private filterREG(s: Section | Room): boolean {
		switch (this.key) {
			case FilterKey.IS:
				if (typeof s.getParam(this.sectionKey) !== "string") {
					throw new InsightError("bad");
				}
				return this.matchString(s.getParam(this.sectionKey) as string);
				break;
			case FilterKey.GT:
				if (typeof s.getParam(this.sectionKey) !== "number") {
					throw new InsightError("bad");
				}
				if ((s.getParam(this.sectionKey) as number) > this.limit) {
					return true;
				}
				break;
			case FilterKey.EQ:
				if (typeof s.getParam(this.sectionKey) !== "number") {
					throw new InsightError("bad");
				}
				if (s.getParam(this.sectionKey) === this.limit) {
					return true;
				}
				break;
			case FilterKey.LT:
				if (typeof s.getParam(this.sectionKey) !== "number") {
					throw new InsightError("bad");
				}
				if ((s.getParam(this.sectionKey) as number) < this.limit) {
					return true;
				}
				break;
		}
		return false;
	}

	private matchString(cur: string): boolean {
		if (this.match.startsWith("*") && this.match.endsWith("*")) {
			const pattern = this.match.slice(1, -1);
			return cur.includes(pattern);
		} else if (this.match.startsWith("*")) {
			const pattern = this.match.slice(1);
			return cur.endsWith(pattern);
		} else if (this.match.endsWith("*")) {
			const pattern = this.match.slice(0, -1);
			return cur.startsWith(pattern);
		} else {
			return cur === this.match;
		}
	}
}
