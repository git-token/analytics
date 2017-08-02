import Promise from 'bluebird'

export default function updateContributorStats({ contribution }) {
  return new Promise((resolve, reject) => {
    const { value, reservedValue, date } = contribution
    this.query({
      queryString: `
        CREATE TABLE IF NOT EXISTS contributor_stats (
          date                 BIGINT NOT NULL DEFAULT 0,
          username             CHARACTER(66),
          tokensCreated        BIGINT NOT NULL DEFAULT 0,
          percentOfTokenSupply REAL,
        );
      `
    }).then(() => {
      return this.query({
        queryString: `
          INSERT INTO contributor_stats (
            username,
            tokensCreated,
            percentOfTokenSupply
          ) VALUES (
          ) ON DUPLICATE KEY UPDATE
            username=VALUES(username),
            tokensCreated=VALUES(tokensCreated),
            percentOfTokenSupply=VALUES(percentOfTokenSupply);
        `
      })
    }).then(() => {
      return this.query({
        queryString: `
          SELECT * FROM contributor_stats;
        `
      })
    }).then((summary) => {
      resolve(summary[0])
    }).catch((error) => {
      this.handleError({ error, method: 'updateSummaryStatistics' })
    })
  })
}
