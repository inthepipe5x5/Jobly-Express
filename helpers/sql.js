const { BadRequestError } = require("../expressError");

/*
### Parameters

  1. `dataToUpdate` (Object): An object containing the data to be updated in the database. The keys of this object represent the column names, and the values represent the new values to be set.

  2. `jsToSql` (Object): An optional object that maps JavaScript property names to their corresponding SQL column names. This is useful when the JavaScript property names differ from the SQL column names.


### Expected Function Behavior

Given an input object `{firstName: 'Aliya', age: 32}` and an optional `jsToSql` object, the function will return:

  ```javascript
  {
    setCols: '"first_name"=$1, "age"=$2',
    values: ['Aliya', 32]
  }
  ```

This output can be used to construct an SQL `UPDATE` statement like:

  ```sql
  UPDATE table_name
  SET "first_name"=$1, "age"=$2
  WHERE ...
  ```

And the `values` array can be used to bind the actual data to the prepared statement placeholders.

### Error Handling

If the `dataToUpdate` object is empty (i.e., no data to update), the function will throw a `BadRequestError` with the message "No data".

*/

function sqlForPartialUpdate(dataToUpdate, jsToSql={}) {
  // Function to generate the necessary SQL query components for updating specific columns in a database table based on the provided data.

  const keys = Object.keys(dataToUpdate);
  if (keys.length === 0) throw new BadRequestError("No data");
  //{firstName: 'Aliya', age: 32} => ['"first_name"=$1', '"age"=$2']
  const cols = keys.map(
    (colName, idx) => `"${jsToSql[colName] || colName}"=$${idx + 1}`
  );

  /*The function returns an object with two properties:
  
  1. `setCols` (String): A comma-separated string of column names mapped to placeholders (`$1`, `$2`, etc.) for prepared statements. This string is used in the `SET` clause of the SQL `UPDATE` statement.
  
  2. `values` (Array): An array of values corresponding to the placeholders in the `setCols` string. These values will be used to bind the actual data to the prepared statement.
  */

  return {
    setCols: cols.join(", "),
    values: Object.values(dataToUpdate),
  };
}

/*
### Usage
  - The `sqlForPartialUpdate` function is typically used in conjunction with database operations that involve updating records in a table based on user-provided data. 
  - It helps to construct the necessary SQL query components while preventing SQL injection attacks by using prepared statements.
*/
module.exports = { sqlForPartialUpdate };
