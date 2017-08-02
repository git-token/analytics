import Promise from 'bluebird'

export default function updateTotalSupply({ contribution }) {
  return new Promise((resolve, reject) => {
    const { date } = contribution
    this.query({
      queryString: `
        CREATE TABLE IF NOT EXISTS total_supply (
          totalSupply    BIGINT NOT NULL DEFAULT 0,
          date           BIGINT NOT NULL DEFAULT 0 PRIMARY KEY
        );
      `
    }).then(() => {
      return this.query({
        queryString: `
          INSERT INTO total_supply (
            totalSupply,
            date
          ) VALUES (
            (SELECT (sum(value)+sum(reservedValue)) FROM contributions WHERE date <= ${date}),
            ${date}
          ) ;
        `
      })
    }).then(() => {
      return this.query({
        queryString: `
          SELECT * FROM total_supply ORDER BY date DESC LIMIT 1;
        `
      })
    }).then((totalSupply) => {
      resolve(totalSupply[0])
    }).catch((error) => {
      this.handleError({ error, method: 'updateTotalSupply' })
    })
  })
}
