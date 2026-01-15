/**
 * I really don't want to do this
 * but yeah this is pretty abstracted from the rest
 * just use a map to hash pairs for identity and then apply keys after
 * ngl if this file actually works with limited errors im actually fucking thanos
 */

/**
 * This file contains the implementation for the
 * transformation class
 */
import Section from "../DataProcessor/Section";
import Room from "../DataProcessor/Room";
import Decimal from "decimal.js";

export enum ApplyType {
	MAX = "MAX",
	MIN = "MIN",
	AVG = "AVG",
	SUM = "SUM",
	COUNT = "COUNT",
}

interface ApplyItem {
	applyKey: string;
	applyToken: string;
	key: string;
}

export class Transformer {
	private groupKeys: string[];
	private applyKeys: ApplyItem[];
	private applyKeysSet: Set<string>;
	private groupedData: Map<string, (Section | Room)[]>;
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
	private static listOfApply = new Set<string>(["MAX", "MIN", "AVG", "SUM", "COUNT"]);
	private static fieldLength = 2;
	private static numKeys = 1;
	private static applyKeyPattern = /[^_]+/;
	private static roundError = 2;

	public constructor() {
		this.groupKeys = [];
		this.applyKeys = [];
		this.datasetName = undefined;
		this.groupedData = new Map<string, (Section | Room)[]>();
		this.applyKeysSet = new Set<string>();
	}

	public validateTransformer(query: any): boolean {
		if (query.TRANSFORMATIONS === undefined) {
			return true;
		}
		query = query.TRANSFORMATIONS;
		if (Object.keys(query).length > Transformer.fieldLength) {
			return false;
		}
		let flag = this.validateGroup(query);
		if (!flag) {
			return false;
		}
		if (query.APPLY === undefined) {
			return false;
		}
		if (!Array.isArray(query.APPLY)) {
			return false;
		}
		query.APPLY.forEach((item: any) => {
			const isValid = this.validateApply(item);
			if (!isValid) {
				flag = false;
			}
		});
		return flag;
	}

	public validateGroup(query: any): boolean {
		if (query.GROUP === undefined) {
			return false;
		}
		if (!Array.isArray(query.GROUP)) {
			return false;
		}
		if (query.GROUP.length === 0) {
			return false;
		}
		let flag = true;
		query.GROUP.forEach((key: string) => {
			const parts = key.split("_");
			const isValid = this.validateField(parts);
			if (isValid) {
				this.datasetName = parts[0];
				this.groupKeys.push(parts[1]);
			} else {
				flag = false;
			}
		});
		return flag;
	}

	public validateApply(item: any): boolean {
		const keys = Object.keys(item);
		if (keys.length !== Transformer.numKeys) {
			return false;
		}
		if (!Transformer.applyKeyPattern.test(keys[0])) {
			return false;
		}
		const subKeys = Object.keys(item[keys[0]]);
		if (subKeys.length !== Transformer.numKeys) {
			return false;
		}
		if (!Transformer.listOfApply.has(subKeys[0])) {
			return false;
		}
		const parts = item[keys[0]][subKeys[0]].split("_");
		const isValid = this.validateField(parts);
		if (!isValid) {
			return false;
		}
		if (this.applyKeysSet.has(keys[0])) {
			return false;
		}
		this.applyKeysSet.add(keys[0]);
		const newApply: ApplyItem = {
			applyKey: keys[0],
			applyToken: subKeys[0],
			key: parts[1],
		};
		this.applyKeys.push(newApply);
		return true;
	}

	public validateField(parts: string[]): boolean {
		if (parts.length !== Transformer.fieldLength) {
			return false;
		} else if (
			(this.datasetName === undefined || this.datasetName === parts[0]) &&
			Transformer.listOfFields.has(parts[1])
		) {
			return true;
		}
		return false;
	}

	public group(data: Section | Room): boolean {
		if (this.datasetName === undefined) {
			this.groupedData.set(JSON.stringify(data), [data]);
			return true;
		}
		const mapKey: Record<string, any> = {};
		for (const key of this.groupKeys) {
			const val = data.getParam(key);
			if (val === -1) {
				return false;
			}
			mapKey[key] = val;
		}
		const key = JSON.stringify(mapKey);
		if (this.groupedData.has(key)) {
			this.groupedData.get(key)?.push(data);
		} else {
			this.groupedData.set(key, [data]);
		}
		return true;
	}

	// im going to abstract everything away, so like when this is called, it will return a list of JSON
	// for the comparator. Now the comparator just needs to sort and return what it wants.
	// so at this point, it literally does not matter if the data is a room or a section
	public transform(): undefined | any[] {
		const ret: any[] | undefined = [];
		for (const [key, value] of this.groupedData) {
			const data = JSON.parse(key);
			for (const item of this.applyKeys) {
				let result;
				if (item.applyToken === ApplyType.MAX) {
					result = this.handleMax(value, item.key);
				} else if (item.applyToken === ApplyType.MIN) {
					result = this.handleMin(value, item.key);
				} else if (item.applyToken === ApplyType.AVG) {
					result = this.handleAvg(value, item.key);
				} else if (item.applyToken === ApplyType.SUM) {
					result = this.handleSum(value, item.key);
				} else {
					result = this.handleCount(value, item.key);
				}
				if (result === undefined) {
					return undefined;
				}
				data[item.applyKey] = result;
			}
			ret.push(data);
		}
		return ret;
	}

	public handleMax(data: (Section | Room)[], key: string): number | undefined {
		let max: number | undefined = undefined;
		for (const value of data) {
			const result = value.getParam(key);
			if (typeof result === "string" || result === undefined) {
				return undefined;
			}
			if (max === undefined) {
				max = result;
			} else {
				max = Math.max(max, result);
			}
		}
		return max;
	}

	public handleMin(data: (Section | Room)[], key: string): number | undefined {
		let min: number | undefined = undefined;
		for (const value of data) {
			const result = value.getParam(key);
			if (typeof result === "string" || result === undefined) {
				return undefined;
			}
			if (min === undefined) {
				min = result;
			} else if (min > result) {
				min = result;
			}
		}
		return min;
	}

	public handleAvg(data: (Section | Room)[], key: string): number | undefined {
		let total = new Decimal(0);
		let count = 0;

		for (const value of data) {
			const result = value.getParam(key);
			if (typeof result === "string" || result === undefined) {
				return undefined;
			}
			total = total.add(new Decimal(result));
			count++;
		}
		const avg = total.toNumber() / count;
		return Number(avg.toFixed(Transformer.roundError));
	}

	public handleSum(data: (Section | Room)[], key: string): number | undefined {
		let sum = 0;
		for (const value of data) {
			const result = value.getParam(key);
			if (typeof result === "string" || result === undefined) {
				return undefined;
			}
			sum += result;
		}
		return Number(sum.toFixed(Transformer.roundError));
	}

	public handleCount(data: (Section | Room)[], key: string): number | undefined {
		const uniqueSet: Set<number | string> = new Set<number | string>();
		for (const value of data) {
			const result = value.getParam(key);
			if (result === undefined) {
				return undefined;
			}
			uniqueSet.add(result);
		}
		return uniqueSet.size;
	}

	public checkKeyInTransformer(keys: string[]): boolean {
		for (const key of keys) {
			if (this.groupKeys.indexOf(key) === -1 && !this.applyKeysSet.has(key)) {
				return false;
			}
		}
		return true;
	}

	public validateKeys(valid: string[]): boolean {
		if (this.datasetName === undefined) {
			return true;
		}
		for (const key of this.groupKeys) {
			if (Transformer.listOfFields.has(key) && valid.indexOf(key) === -1) {
				return false;
			}
		}
		for (const key of this.applyKeys) {
			if (Transformer.listOfFields.has(key.key) && valid.indexOf(key.key) === -1) {
				return false;
			}
		}
		return true;
	}
}
