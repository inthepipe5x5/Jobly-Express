const { sqlForPartialUpdate } = require("../helpers/sql.js");
const { BadRequestError } = require("../expressError.js");

describe("sqlForPartialUpdate", () => {
  test("returns correct setCols and values for valid input", () => {
    const dataToUpdate = { firstName: "Aliya", age: 32 };
    const jsToSql = { firstName: "first_name" };
    const result = sqlForPartialUpdate(dataToUpdate, jsToSql);

    expect(result).toEqual({
      setCols: '"first_name"=$1, "age"=$2',
      values: ["Aliya", 32],
    });
  });

  test("handles case when jsToSql is not provided", () => {
    const dataToUpdate = { firstName: "Aliya", age: 32 };
    const result = sqlForPartialUpdate(dataToUpdate, {});

    expect(result).toEqual({
      setCols: '"firstName"=$1, "age"=$2',
      values: ["Aliya", 32],
    });
  });

  test("throws BadRequestError when dataToUpdate is empty", () => {
    const dataToUpdate = {};
    expect(() => sqlForPartialUpdate(dataToUpdate)).toThrow(BadRequestError);
  });
});
 