import Promise, { promisifyAll, join } from 'bluebird'

export default function updateTokenInflationRate({ contribution }) {
  return new Promise((resolve, reject) => {
    const { value, reservedValue, date } = contribution
    this.query({
      queryString: `
        CREATE TABLE IF NOT EXISTS token_inflation (
          date          BIGINT NOT NULL DEFAULT 0 PRIMARY KEY,
          periodicRate  REAL
        );
      `
    }).then(() => {
      return this.query({
        queryString: `
          INSERT INTO token_inflation (
            date,
            periodicRate
          ) VALUES (
            ${date},
            (SELECT (sum(value+reservedValue))/(sum(value+reservedValue)-(1.0*${value + reservedValue}))-1.0 FROM contributions WHERE date <= ${date})
          );
        `
      })
    }).then(() => {
      return this.query({
        queryString: `
          SELECT * FROM token_inflation ORDER BY date DESC LIMIT 1;
        `
      })
    }).then((inflation) => {
      resolve(inflation[0])
    }).catch((error) => {
      this.handleError({ error, method: 'updateTokenInflationRate' })
    })
  })
}
