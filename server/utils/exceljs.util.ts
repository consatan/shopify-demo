import { Row, CellValue, Workbook, Worksheet } from 'exceljs';

type StringOrNull = string | null;

type NumberOrNull = number | null;

type BooleanOrNull = boolean | null;

// ExcelJS util class
class ExcelJSUtil {
  /**
   * Get cell value
   *
   * @param row
   * @param indexOrKey Cell index(from 1 to 16384) or Cell key(from A to XFD)
   *   or Heade name(if instance of workbook with `headers: true`)
   * @returns return `null` if out of bounds
   */
  getCell(row: Row, indexOrKey: string | number): CellValue {
    try {
      return row.getCell(indexOrKey).value;
    } catch (err) {
      return null;
    }
  }

  /**
   * Get cell value of string type
   * Note: any object have `toString` method will be return `toString` result
   *
   * @param row
   * @param indexOrKey See `getCell` detail
   * @returns Return a string type value, or null if not a string type
   */
  getStringCell(row: Row, indexOrKey: string | number): StringOrNull {
    return this.getCell(row, indexOrKey)?.toString() || null;
  }

  /**
   * Get cell value of number type
   * Note: `true` value return `1`, `false` value return `0`
   *
   * @param row
   * @param indexOrKey See `getCell` detail
   * @returns Return a number type value, or null if not a number type.
   */
  getNumberCell(row: Row, indexOrKey: string | number): NumberOrNull {
    return Number(this.getCell(row, indexOrKey)) || null;
  }

  /**
   * Get cell value of boolean type
   * Note: string type value 'true','false' will be return its meaning
   *
   * @param row
   * @param indexOrKey See `getCell` detail
   * @returns Return a boolean type value, or null if not a boolean type
   */
  getBooleanCell(row: Row, indexOrKey: string | number): BooleanOrNull {
    const value = this.getCell(row, indexOrKey);
    switch (typeof value) {
      case 'boolean':
        return value;
      case 'string':
        const val = value.toString().toUpperCase();
        return ['TRUE', 'FALSE'].includes(val) ? val === 'TRUE' : null;
      default:
        return null;
    }
  }

  /**
   * Get ExcelJS.Worksheet instance from csv or xlsx file
   *
   * @param path Path of csv or xlsx file
   * @param header Is there have a header row
   * @param originName Upload file original file name
   * @returns Worksheet instance
   */
  async createFromFile(
    path: string,
    header = true,
    originName = ''
  ): Promise<Worksheet> {
    if (
      originName.toLowerCase().endsWith('.csv') ||
      path.toLowerCase().endsWith('.csv')
    ) {
      return await new Workbook().csv.readFile(path, {
        // The `parserOptions.headers` option cannot working in
        // current version (v4.3.0)
        // Fixed by this [PR](https://github.com/exceljs/exceljs/pull/2080)
        parserOptions: { headers: header },
      });
    } else {
      const workbook = await new Workbook().xlsx.readFile(path);
      const worksheet = workbook.worksheets[0];
      // Set header row
      // If use official version (before above PR merged), csv file also
      // using below code to set header row
      if (header) {
        const columns = [];
        const headerRow = worksheet.getRow(1);
        for (let i = 1; i < headerRow.cellCount; i++) {
          const header = headerRow.getCell(i).value as string;
          columns.push({ header, key: header });
        }
        worksheet.columns = columns;
      }

      return worksheet;
    }
  }
}

export default new ExcelJSUtil();
