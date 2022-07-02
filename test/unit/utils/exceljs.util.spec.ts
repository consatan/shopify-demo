import 'mocha';
import { expect } from 'chai';
import { Workbook, Row } from 'exceljs';
import { join } from 'path';
import util from '../../../server/utils/exceljs.util';

describe('ExcelJS Util', () => {
  let row: Row;

  before(async () => {
    const workbook = await new Workbook().xlsx.readFile(
      join(__dirname, '../data/sample.xlsx')
    );

    row = workbook.worksheets[0].getRow(1);
  });

  it('should get cell value', () => {
    expect(util.getCell(row, 1)).to.equal('string');
    expect(util.getCell(row, 2)).to.equal(123);
    expect(util.getCell(row, 3)).to.equal(true);
    expect(util.getCell(row, 4)).to.equal(null);

    expect(util.getCell(row, 'A')).to.equal('string');
    expect(util.getCell(row, 'B')).to.equal(123);
    expect(util.getCell(row, 'C')).to.equal(true);
    expect(util.getCell(row, 'D')).to.equal(null);

    expect(util.getCell(row, 'NotExistsColumn')).to.equal(null);
  });

  it('should get string value', () => {
    ['string', '123', 'true', null].forEach((v, i) => {
      expect(util.getStringCell(row, i + 1)).to.equal(v);
    });
  });

  it('should get number value', () => {
    [null, 123, 1, null].forEach((v, i) => {
      expect(util.getNumberCell(row, i + 1)).to.equal(v);
    });
  });

  it('should get boolean value', () => {
    [null, null, true, null].forEach((v, i) => {
      expect(util.getBooleanCell(row, i + 1)).to.equal(v);
    });
  });

  it('should create worksheet from file (getCell by header name)', async () => {
    const xlsx = await util.createFromFile(
      join(__dirname, '../data/products.xlsx')
    );

    const csv = await util.createFromFile(
      join(__dirname, '../data/products.csv')
    );

    expect(xlsx.rowCount).to.eq(csv.rowCount);

    expect(csv.getRow(1).getCell('Title').value).to.equal('Title');
    expect(xlsx.getRow(1).getCell('Title').value).to.equal('Title');

    expect(csv.getRow(2).getCell('Title').value).to.equal('7 Shakra Bracelet');
    expect(xlsx.getRow(2).getCell('Title').value).to.equal('7 Shakra Bracelet');

    expect(csv.getRow(3).getCell('Title').value).to.equal(null);
    expect(xlsx.getRow(3).getCell('Title').value).to.equal(null);
  });

  it('should create worksheet from file', async () => {
    const xlsx = await util.createFromFile(
      join(__dirname, '../data/products.xlsx'),
      false
    );

    const csv = await util.createFromFile(
      join(__dirname, '../data/products.csv'),
      false
    );

    expect(xlsx.rowCount).to.eq(csv.rowCount);

    try {
      xlsx.getRow(1).getCell('Title');
    } catch (err) {
      expect(err.message).to.equal(
        'Out of bounds. Excel supports columns from 1 to 16384'
      );
    }

    try {
      csv.getRow(1).getCell('Title');
    } catch (err) {
      expect(err.message).to.equal(
        'Out of bounds. Excel supports columns from 1 to 16384'
      );
    }
  });
});
