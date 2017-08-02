import Promise from 'bluebird'

export default function updateUserTokenCreation({ contribution }) {
  return new Promise((resolve, reject) => {
    const { date } = contribution
    this.query({ queryString: `
      CREATE TABLE IF NOT EXISTS user_token_creation (
        date                  BIGINT NOT NULL DEFAULT 0,
        username              CHARACTER(42),
        tokensCreated         BIGINT NOT NULL DEFAULT 0,
        percentOfTokenSupply  REAL
      );
    `}).then(() => {
      return this.query({
        queryString: `
          INSERT INTO user_token_creation (
            date,
            username,
            tokensCreated,
            percentOfTokenSupply
          ) SELECT
            ${date},
            username,
            sum(value+reservedValue) AS tokensCreated,
            sum(value+reservedValue)/(SELECT sum(value+reservedValue) FROM contributions WHERE date <= ${date}) AS percentOfTokenSupply
          FROM contributions
          WHERE date <= ${date}
          GROUP BY username;
        `
      })
    }).then(() => {
      return this.query({
        queryString: `
          SELECT * FROM user_token_creation;
        `
      })
    }).then((userTokenCreation) => {
      resolve(userTokenCreation)
    }).catch((error) => {
      this.handleError({ error, method: 'updateUserTokenCreation' })
    })
  })
}
