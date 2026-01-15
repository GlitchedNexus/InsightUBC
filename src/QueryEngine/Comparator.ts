/**
 * Just some rough notes on what I need to do to both validate
 * And construct transformations + new sort in options
 * Transformation should be done first, for validation
 * Create a seperate object for this, which will later be applied on the returned list
 * Then sort, will create a seperate object for this
 * Note: Remember that now queries can happen on both types of datasets
 * there were will be dependencies that you will need to deal with
 * should probably do transformations first, its annoying but it creates valid keys that you must later also consider
 * Im going to write support for both datasets into one class, i geniunely want to kms
 * DEPENDCEY SOLUTION:
 * transformer will run first on raw data, will return grouped + new keys in a JSON format
 * comparator will fail if trying to return fields that don't exist period
 * two part fields will be validated regularly, new transformer ones wont go through validation
 * this is like a contract between transformations and comparator
 */

/**
 * This file contains the implementation for the
 * comparator class
 */

import { InsightResult, InsightError } from "../controller/IInsightFacade";

export enum SortType {
	UP = "UP",
	DOWN = "DOWN",
}

export class Comparator {
	public returnKeys: string[];
	private orderKeys: string[];
	private sortKey: SortType;
	public datasetName: string | undefined;
	private static listOfFields = new Set<string>([
		"uuid",
		"id",
		"title",
		"instructor",
		"dept",
		"year",
		"avg",
		"pass",
		"fail",
		"audit",
		"fullname",
		"shortname",
		"number",
		"name",
		"address",
		"lat",
		"lon",
		"seats",
		"type",
		"furniture",
		"href",
	]);
	private static fieldLength = 2;

	public constructor() {
		this.datasetName = undefined;
		this.returnKeys = [];
		this.orderKeys = [];
		this.sortKey = SortType.UP;
	}

	public validateOptions(query: any): boolean {
		if (query.OPTIONS === undefined) {
			return false;
		}
		query = query.OPTIONS;
		if (Object.keys(query).length > Comparator.fieldLength) {
			return false;
		}
		const cols = query.COLUMNS;
		if (cols === undefined) {
			return false;
		}
		if (!Array.isArray(cols)) {
			return false;
		}
		let flag = true;
		cols.forEach((key: string) => {
			const parts = key.split("_");
			if (parts.length < Comparator.fieldLength) {
				this.returnKeys.push(parts[0]);
			} else {
				const isValid = this.validateField(parts);
				if (isValid) {
					this.datasetName = parts[0];
					this.returnKeys.push(parts[1]);
				} else {
					flag = false;
				}
			}
		});
		if (query.ORDER !== undefined && flag) {
			flag = this.validateOrder(query.ORDER);
		}
		return flag;
	}

	public validateOrder(order: any): boolean {
		if (typeof order === "string") {
			return this.parseKey(order);
		}
		if (Object.keys(order).length > Comparator.fieldLength) {
			return false;
		}
		if (order.dir === undefined) {
			return false;
		}
		if (order.dir === SortType.DOWN) {
			this.sortKey = SortType.DOWN;
		} else if (order.dir === SortType.UP) {
			this.sortKey = SortType.UP;
		} else {
			return false;
		}
		const keys = order.keys;
		return this.keyStuff(keys);
	}

	public keyStuff(keys: any): boolean {
		if (keys === undefined) {
			return false;
		}
		if (!Array.isArray(keys)) {
			return false;
		}
		if (keys.length === 0) {
			return false;
		}
		for (const key of keys) {
			if (typeof key !== "string") {
				return false;
			}
			const res = this.parseKey(key);
			if (!res) {
				return false;
			}
		}
		return true;
	}

	public parseKey(key: string): boolean {
		const parts = key.split("_");
		if (parts.length < Comparator.fieldLength) {
			this.orderKeys.push(parts[0]);
			return true;
		}
		const isValid = this.validateField(parts);
		if (isValid && this.returnKeys.indexOf(parts[1]) !== -1) {
			this.orderKeys.push(parts[1]);
			return true;
		}
		return false;
	}

	public validateField(parts: string[]): boolean {
		if (parts.length !== Comparator.fieldLength) {
			return false;
		} else if (
			(this.datasetName === undefined || this.datasetName === parts[0]) &&
			Comparator.listOfFields.has(parts[1])
		) {
			return true;
		}
		return false;
	}

	// dude
	public executeComparator(data: any[]): InsightResult[] | undefined {
		let ret: InsightResult[] = [];
		for (const item of data) {
			const cur: InsightResult = {};
			for (const key of this.returnKeys) {
				if (item[key] === undefined) {
					return undefined;
				}
				let name: string = key;
				if (Comparator.listOfFields.has(key)) {
					name = this.datasetName + "_" + key;
				}
				cur[name] = item[key];
			}
			ret.push(cur);
		}
		ret = this.sortQueryResults(ret);
		return ret;
	}

	// this is shameless
	public sortQueryResults(results: InsightResult[]): InsightResult[] {
		if (this.orderKeys.length === 0 || results.length === 0) {
			return results;
		}

		return results.sort((a, b) => {
			for (const key of this.orderKeys) {
				const res = this.compare(key, a, b);
				if (res !== 0) {
					return res;
				}
			}
			return 0;
		});
	}

	public compare(key: string, a: InsightResult, b: InsightResult): number {
		let index: string = key;
		if (Comparator.listOfFields.has(key)) {
			index = `${this.datasetName}_${key}`;
		}
		if (!(index in a)) {
			throw new InsightError("Error in Options");
		}
		const aValue = a[index];
		const bValue = b[index];
		let res = 0;

		// might have to replace localecompare
		if (typeof aValue === "string" && typeof bValue === "string") {
			if (aValue < bValue) {
				res = -1;
			} else if (aValue > bValue) {
				res = 1;
			} else {
				res = 0;
			}
		} else if (typeof aValue === "number" && typeof bValue === "number") {
			res = aValue - bValue;
		}
		if (this.sortKey === SortType.DOWN) {
			res *= -1;
		}
		return res;
	}

	public validateKeys(valid: string[]): boolean {
		if (this.datasetName === undefined) {
			return true;
		}
		for (const key of this.returnKeys) {
			if (Comparator.listOfFields.has(key) && valid.indexOf(key) === -1) {
				return false;
			}
		}
		return true;
	}
}
