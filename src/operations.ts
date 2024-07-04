import { findValueByPath, isString } from './utils';

export function parseExpression(
	exp: string,
	values: Record<string, any>,
	defaultValues: Record<string, any> = {},
	debug: boolean = false,
): any {
	const result = _parseExpression(exp, values, defaultValues, debug);
	if (debug) {
		console.log(`${exp} =`, result);
	}

	return result;
}

function _parseExpression(
	exp: string,
	values: Record<string, any>,
	defaultValues: Record<string, any> = {},
	debug: boolean = false,
): any {
	if (values) {
		exp = exp.trim();

		// literal string
		if (exp.startsWith('"') && exp.endsWith('"')) {
			return exp.slice(1, -1).replace(/\\"/g, '"');
		}

		let { value, found } = findValueByPath(values, exp);

		if(!found || value === null) {
			let defaults = findValueByPath(defaultValues, exp);
			if(defaults.found) {
				return defaults.value;
			}
		}

		if (found) {
			return value;
		}

		// Dynamic variables
		if (exp === '$NOW') {
			return new Date();
		}
		if (exp.startsWith('$CURRENT_USER')) {
			if (exp === '$CURRENT_USER') {
				return values.__currentUser?.id;
			}
			return findValueByPath({ $CURRENT_USER: values.__currentUser }, exp).value;
		}

		const opMatch = parseOp(exp);
		if (opMatch) {
			const { op, args } = opMatch;

			// unary operators
			if (args.length === 1) {
				const valueA = parseExpression(args[0], values, defaultValues, debug);
				// type conversion
				if (op === 'INT') {
					return parseInt(valueA);
				}
				if (op === 'FLOAT') {
					return parseFloat(valueA);
				}
				if (op === 'STRING') {
					return String(valueA);
				}
				if (op === 'DATE') {
					return new Date(valueA);
				}
				// format
				if (op === 'SLUG') {
					return toSlug(valueA);
				}
				if (op === 'CURRENCY') {
					return new Intl.NumberFormat().format(valueA);
				}
				// date
				if (op === 'DATE_ISO') {
					return new Date(valueA).toISOString();
				}
				if (op === 'DATE_UTC') {
					return new Date(valueA).toUTCString();
				}
				if (op === 'DATE_STR') {
					// format YYYY-MM-DD
					const date = new Date(valueA);
					const year = date.getFullYear();
					const month = (date.getMonth() + 1).toString().padStart(2, '0');
					const day = date.getDate().toString().padStart(2, '0');
					return `${year}-${month}-${day}`;
				}
				if (op === 'TIME_STR') {
					// format HH:MM:SS
					const date = new Date(valueA);
					const hours = date.getHours().toString().padStart(2, '0');
					const minutes = date.getMinutes().toString().padStart(2, '0');
					const seconds = date.getSeconds().toString().padStart(2, '0');
					return `${hours}:${minutes}:${seconds}`;
				}
				if (['YEAR', 'MONTH', 'GET_DATE', 'DAY', 'HOURS', 'MINUTES', 'SECONDS', 'TIME'].includes(op)) {
					if (valueA instanceof Date) {
						const op2func = {
							YEAR: 'getFullYear',
							MONTH: 'getMonth',
							GET_DATE: 'getDate',
							DAY: 'getDay',
							HOURS: 'getHours',
							MINUTES: 'getMinutes',
							SECONDS: 'getSeconds',
							TIME: 'getTime',
						};
						return valueA[op2func[op]]();
					}
					return 0;
				}
				// arithmetic
				if (op === 'ABS') {
					return Math.abs(valueA);
				}
				if (op === 'SQRT') {
					return Math.sqrt(valueA);
				}
				if (op === 'SUM') {
					if (valueA instanceof Array) {
						return valueA.reduce((partialSum, a) => partialSum + a, 0);
					}
					return 0;
				}
				if (op === 'AVERAGE') {
					if (valueA instanceof Array) {
						return valueA.reduce((partialSum, a) => partialSum + a, 0) / valueA.length;
					}
					return 0;
				}
				if (op === 'CEIL') {
					return Math.ceil(valueA);
				}
				if (op === 'FLOOR') {
					return Math.floor(valueA);
				}
				if (op === 'ROUND') {
					return Math.round(valueA);
				}
				if (op === 'EXP') {
					return Math.exp(valueA);
				}
				if (op === 'LOG') {
					return Math.log(valueA);
				}
				if (op === 'MAX') {
					if (valueA instanceof Array) {
						return Math.max(...valueA);
					}
					return 0;
				}
				if (op === 'MIN') {
					if (valueA instanceof Array) {
						return Math.min(...valueA);
					}
					return 0;
				}
				// boolean
				if (op === 'NULL') {
					return valueA === null;
				}
				if (op === 'NOT_NULL') {
					return valueA !== null;
				}
				if (op === 'NOT') {
					return !valueA;
				}
				// string
				if (op === 'STR_LEN') {
					return String(valueA).length;
				}
				if (op === 'LOWER') {
					return String(valueA).toLowerCase();
				}
				if (op === 'UPPER') {
					return String(valueA).toUpperCase();
				}
				if (op === 'TRIM') {
					return String(valueA).trim();
				}
				if (op === 'ENCODE_URL_COMPONENT') {
					return encodeURIComponent(valueA);
				}
				// array
				if (op === 'ARRAY_LEN') {
					if (valueA instanceof Array) {
						return valueA.length;
					}
					return 0;
				}
				// array and string
				if (op === 'LENGTH') {
					if (valueA instanceof Array || isString(valueA)) {
						return valueA.length;
					}
					return null;
				}
				if (op === 'FIRST') {
					if (valueA instanceof Array || isString(valueA)) {
						return valueA[0];
					}
					return null;
				}
				if (op === 'LAST') {
					if (valueA instanceof Array || isString(valueA)) {
						return valueA[valueA.length - 1];
					}
					return null;
				}
				if (op === 'REVERSE') {
					if (valueA instanceof Array) {
						return valueA.reverse();
					}
					if (isString(valueA)) {
						return valueA.split('').reverse().join('');
					}
					return null;
				}
				// json
				if (op === 'JSON_PARSE') {
					return JSON.parse(valueA);
				}
				if (op === 'JSON_STRINGIFY') {
					return JSON.stringify(valueA);
				}
			} else if (args.length === 2) {
				// aggregated operators
				if (op === 'ASUM') {
					// aggregated sum
					return (values[args[0]] as unknown[])?.reduce((acc, item) => acc + parseExpression(args[1], item as typeof values, {}, debug), 0) ?? 0;
				}
				if (op === 'AMIN') {
					// aggregated min
					return (values[args[0]] as unknown[])?.reduce((acc, item) => Math.min(acc, parseExpression(args[1], item as typeof values, {}, debug)), Infinity) ?? 0;
				}
				if (op === 'AMAX') {
					// aggregated max
					return (values[args[0]] as unknown[])?.reduce((acc, item) => Math.max(acc, parseExpression(args[1], item as typeof values, {}, debug)), -Infinity) ?? 0;
				}
				if (op === 'AAVG') {
					// aggregated average
					const arr = (values[args[0]] as unknown[]) ?? [];
					return arr.reduce((acc, item) => acc + parseExpression(args[1], item as typeof values, {}, debug), 0) / arr.length;
				}
				if (op === 'AMUL') {
					// aggregated multiplication
					return (values[args[0]] as unknown[])?.reduce((acc, item) => acc * parseExpression(args[1], item as typeof values, {}, debug), 1) ?? 0;
				}
				if (op === 'AAND') {
					// aggregated and
					return (values[args[0]] as unknown[])?.reduce((acc, item) => acc && parseExpression(args[1], item as typeof values, {}, debug), true) ?? false;
				}
				if (op === 'AOR') {
					// aggregated or
					return (values[args[0]] as unknown[])?.reduce((acc, item) => acc || parseExpression(args[1], item as typeof values, {}, debug), false) ?? false;
				}
				if (op === 'ACOUNT') {
					// aggregated count
					return (values[args[0]] as unknown[])?.reduce((acc, item) => acc + (parseExpression(args[1], item as typeof values, {}, debug) ? 1 : 0), 0) ?? 0;
				}
				// loop operators
				if (op === 'MAP') {
					// map
					return (values[args[0]] as unknown[])?.map((item) => parseExpression(args[1], item as typeof values, {}, debug)) ?? [];
				}
				if (op === 'FILTER') {
					// filter
					return (values[args[0]] as unknown[])?.filter((item) => parseExpression(args[1], item as typeof values, {}, debug)) ?? [];
				}
				if (op === 'SORT') {
					// sort
					const arr = (values[args[0]] as unknown[]) ?? [];
					const field = args[1];
					// copy the array to avoid mutating the original array
					return [...arr].sort((a, b) => {
						const aVal = parseExpression(field, a as typeof values, {}, debug);
						const bVal = parseExpression(field, b as typeof values, {}, debug);
						if (aVal < bVal) return -1;
						if (aVal > bVal) return 1;
						return 0;
					});
				}

				// binary operators
				const valueA = parseExpression(args[0], values, defaultValues, debug);
				const valueB = parseExpression(args[1], values, defaultValues, debug);

				// arithmetic
				if (op === 'SUM') {
					return valueA + valueB;
				}
				if (op === 'SUBTRACT') {
					return valueA - valueB;
				}
				if (op === 'MULTIPLY') {
					return valueA * valueB;
				}
				if (op === 'DIVIDE') {
					return valueA / valueB;
				}
				if (op === 'REMAINDER') {
					return valueA % valueB;
				}
				if (op === 'ROUND') {
					return (valueA as number).toFixed(valueB);
				}
				if (op === 'MAX') {
					return Math.max(valueA, valueB);
				}
				if (op === 'MIN') {
					return Math.min(valueA, valueB);
				}
				if (op === 'POWER') {
					return Math.pow(valueA, valueB);
				}
				// string
				if (op === 'LEFT') {
					return String(valueA).slice(0, Number(valueB));
				}
				if (op === 'RIGHT') {
					return String(valueA).slice(-Number(valueB));
				}
				if (op === 'REPT') {
					return String(valueA).repeat(Number(valueB));
				}
				if (op === 'JOIN') {
					if (valueA instanceof Array) {
						return valueA.join(String(valueB));
					}
					return '';
				}
				if (op === 'SPLIT') {
					return String(valueA).split(String(valueB));
				}
				if (op === 'SEARCH') {
					const str = String(valueA);
					const find = String(valueB);
					return str.indexOf(find);
				}
				// boolean
				if (op === 'EQUAL') {
					return valueA === valueB;
				}
				if (op === 'NOT_EQUAL') {
					return valueA !== valueB;
				}
				if (op === 'GT') {
					return valueA > valueB;
				}
				if (op === 'GTE') {
					return valueA >= valueB;
				}
				if (op === 'LT') {
					return valueA < valueB;
				}
				if (op === 'LTE') {
					return valueA <= valueB;
				}
				if (op === 'AND') {
					return valueA && valueB;
				}
				if (op === 'OR') {
					return valueA || valueB;
				}
				// array and string
				if (op === 'CONCAT') {
					if (valueA instanceof Array) {
						return valueA.concat(valueB);
					}
					return String(valueA) + String(valueB);
				}
				if (op === 'AT') {
					if (valueA instanceof Array || isString(valueA)) {
						return valueA[Number(valueB)];
					}
					return null;
				}
				if (op === 'INDEX_OF') {
					if (valueA instanceof Array || isString(valueA)) {
						return valueA.indexOf(valueB);
					}
					return null;
				}
				if (op === 'INCLUDES') {
					if (valueA instanceof Array || isString(valueA)) {
						return valueA.includes(valueB);
					}
					return null;
				}
				// json
				if (op === 'JSON_GET') {
					if (typeof valueA === 'object' && !Array.isArray(valueA) && valueA !== null) {
						return findValueByPath(valueA, valueB).value;
					}
					return null;
				}
			} else if (args.length === 3) {
				const valueA = parseExpression(args[0], values, defaultValues, debug);
				const valueB = parseExpression(args[1], values, defaultValues, debug);
				const valueC = parseExpression(args[2], values, defaultValues, debug);

				if (op === 'IF') {
					if (valueA === true) {
						return valueB;
					}
					return valueC;
				}
				if (op === 'MID') {
					const str = String(valueA);
					const startAt = Number(valueB);
					const count = Number(valueC);
					return str.slice(startAt, startAt + count);
				}
				if (op === 'SUBSTITUTE') {
					const str = String(valueA);
					const old = String(valueB);
					const newStr = String(valueC);
					return str.split(old).join(newStr);
				}
				if (op === 'SEARCH') {
					const str = String(valueA);
					const find = String(valueB);
					const startAt = Number(valueC);
					return str.indexOf(find, startAt);
				}
				if (op === 'LOCALE_STR') {
					const date = new Date(valueA);
					const locale = String(valueB);
					let options = {};
					try {
						options = JSON.parse(valueC);
					} catch (e) {
						// ignore
					}
					return date.toLocaleString(locale, options);
				}
				if (op === 'RANGE') {
					// RANGE(start, end, step
					// RANGE(1, 10, 2) => [1, 3, 5, 7, 9]
					// RANGE(10, 1, -2) => [10, 8, 6, 4, 2]
					const start = Number(valueA);
					const end = Number(valueB);
					const step = Number(valueC);
					const arr = [];
					if (step > 0) {
						for (let i = start; i <= end; i += step) {
							arr.push(i);
						}
					} else if (step < 0) {
						for (let i = start; i >= end; i += step) {
							arr.push(i);
						}
					}
					return arr;
				}
				if (op === 'SLICE') {
					if (valueA instanceof Array || isString(valueA)) {
						const start = Number(valueB);
						const end = Number(valueC);
						return valueA.slice(start, end);
					}
					return null;
				}
			} else if (args.length % 2 === 0) {
				if (op === 'IFS') {
					for (let i = 0; i < args.length; i += 2) {
						if (parseExpression(args[i], values, defaultValues, debug) === true) {
							return parseExpression(args[i + 1], values, defaultValues, debug);
						}
					}
					return null;
				}
			}
		}

		// number literal
		if (!isNaN(parseFloat(exp))) {
			return parseFloat(exp);
		}

		if (debug) {
			throw new Error(`Cannot parse expression: ${exp}`);
		}
	}
	return '';
}

export function parseOp(exp: string): {
	op: string;
	args: string[];
} | null {
	const match = exp.trim().match(/^([A-Z_]+)\((.+)\)$/);
	if (match) {
		const args = [];
		const op = match[1] as string;
		const innerExp = match[2] as string;

		let braceCount = 0,
			i = 0,
			j = 0,
			inQuote = false,
			escapeNext = false;
		for (; i < innerExp.length; i += 1) {
			const c = innerExp[i];
			if (c === '(' && !inQuote) braceCount += 1;
			else if (c === ')' && !inQuote) braceCount -= 1;
			else if (c === ',' && !inQuote && braceCount === 0) {
				args.push(innerExp.slice(j, i).trim());
				j = i + 1;
			}
			else if (c === '"' && !escapeNext) inQuote = !inQuote;
			else if (c === '\\' && inQuote) {
				escapeNext = true;
				continue;
			}
			escapeNext = false;
		}
		if (j < i) {
			args.push(innerExp.slice(j, i).trim());
		}

		return { op, args };
	}
	return null;
}

export function toSlug(str: unknown) {
	if (typeof str !== 'string') {
		return '';
	}

	let res = str.replace(/^\s+|\s+$/g, ''); // trim
	res = res.toLowerCase();

	// remove accents
	const asciiMap: Record<string, string> = {
		"æ": "ae", "œ": "oe", "à": "a", "á": "a", "â": "a", "ã": "a", "å": "a", "ą": "a",
		"ç": "c", "è": "e", "é": "e", "ê": "e", "ę": "e", "ì": "i", "í": "i", "î": "i",
		"ð": "d", "ñ": "n", "ò": "o", "ó": "o", "ô": "o", "õ": "o", "ø": "o",
		"ù": "u", "ú": "u", "ý": "y", "þ": "th", "ß": "ss", "ä": "e", "ë": "i",
		"ï": "i", "ö": "u", "ü": "u", "ÿ": "y", "ś": "s", "ń": "n", "ć": "c",
		"ź": "z", "ł": "l", "ż": "z", "ả": "a", "ạ": "a", "ă": "a", "ằ": "a",
		"ắ": "a", "ẳ": "a", "ẵ": "a", "ặ": "a", "ầ": "a", "ấ": "a", "ẩ": "a",
		"ẫ": "a", "ậ": "e", "ẻ": "e", "ẽ": "e", "ẹ": "e", "ề": "e", "ế": "e",
		"ể": "e", "ễ": "e", "ệ": "e", "đ": "d", "ủ": "u", "ũ": "u", "ụ": "u",
		"ư": "u", "ừ": "u", "ứ": "u", "ử": "u", "ữ": "u", "ự": "u", "ỏ": "o",
		"ọ": "o", "ồ": "o", "ố": "o", "ổ": "o", "ỗ": "o", "ộ": "o", "ơ": "o",
		"ờ": "o", "ớ": "o", "ở": "o", "ỡ": "o", "ợ": "o", "ỉ": "i", "ĩ": "i",
		"ị": "i", "ỳ": "y", "ỹ": "y", "ỵ": "y",
	};

	let index = 0;

	while (index < str.length) {
		const char = str.charAt(index);

		if (char in asciiMap) {
			res = res.replace(new RegExp(char, 'g'), asciiMap[char]);
		}

		index++;
	}

	res = res
		.replace(/[^a-z0-9 -]/g, '') // remove invalid chars
		.replace(/\s+/g, '-') // collapse whitespace and replace by -
		.replace(/-+/g, '-'); // collapse dashes

	return res;
}
