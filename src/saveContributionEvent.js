import Promise from 'bluebird'

export default function saveContributionEvent({ event }) {
  return new Promise((resolve, reject) => {
    const { transactionHash, args } = event
    this.query({
      queryString: `
        CREATE TABLE IF NOT EXISTS contributions (
          txHash          CHARACTER(66) PRIMARY KEY,
          contributor     CHARACTER(42),
          username        CHARACTER(42),
          value           BIGINT NOT NULL DEFAULT 0,
          reservedValue   BIGINT NOT NULL DEFAULT 0,
          date            BIGINT NOT NULL DEFAULT 0,
          rewardType      CHARACTER(42)
        ) ENGINE = INNODB;
      `,
    }).then(() => {
      return this.query({
        queryString: `
          INSERT INTO contributions (
            txHash,
            contributor,
            username,
            value,
            reservedValue,
            date,
            rewardType
          ) VALUES (
            "${transactionHash}",
            "${args['contributor']}",
            "${args['username']}",
            ${args['value'].toNumber()},
            ${args['reservedValue'].toNumber()},
            ${args['date'].toNumber()},
            "${args['rewardType']}"
          );
        `
      })
    }).then(() => {
      return this.query({
        queryString: `
          SELECT * FROM contributions WHERE txHash = "${transactionHash}";
        `
      })
    }).then((result) => {
      resolve(result[0])
    }).catch((error) => {
      this.handleError({ error, method: 'saveContributionEvent' })
    })
  })
}
