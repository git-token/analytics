import Promise, { promisifyAll, join } from 'bluebird'

export default function updateInflationRateAverage({ contribution }) {
  return new Promise((resolve, reject) => {
    const { date } = contribution
    this.query({
      queryString: `
        CREATE TABLE IF NOT EXISTS token_inflation_mean (
          date          BIGINT NOT NULL DEFAULT 0 PRIMARY KEY,
          geometricMean REAL
        );
      `
    }).then(() => {
      return this.query({
        queryString: `
          INSERT INTO token_inflation_mean (
            date,
            geometricMean
          ) VALUES (
            ${date},
            (SELECT ROUND(EXP(SUM(LOG(POW(1+periodicRate, (SELECT 1/count(*) FROM token_inflation WHERE date <= ${date}))))), 8)-1.0 FROM token_inflation WHERE date <= ${date})
          );
        `
      })
    }).then(() => {
      return this.query({
        queryString: `
          SELECT * FROM token_inflation_mean ORDER BY date DESC LIMIT 1;
        `
      })
    }).then((inflation) => {
      resolve(inflation[0])
    }).catch((error) => {
      this.handleError({ error, method: 'updateInflationRateAverage' })
    })
  })
}
