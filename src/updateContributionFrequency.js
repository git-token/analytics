import Promise from 'bluebird'

export default function updateContributionFrequency({ contribution }) {
  return new Promise((resolve, reject) => {
    this.query({ queryString: `
      CREATE TABLE IF NOT EXISTS contribution_frequency (
        rewardType     CHARACTER(66) PRIMARY KEY,
        count          BIGINT NOT NULL DEFAULT 0,
        percentOfTotal REAL
      );
    `}).then(() => {
      return this.query({
        queryString: `
          INSERT INTO contribution_frequency (
            rewardType,
            count,
            percentOfTotal
          ) SELECT
          rewardType, count(rewardType),
          count(rewardType)/(SELECT count(*)*1.0 FROM contributions)*100.0
          FROM contributions GROUP BY rewardType
          ON DUPLICATE KEY UPDATE
          rewardType=VALUES(rewardType),
          count=VALUES(count),
          percentOfTotal=VALUES(percentOfTotal);
        `
      })
    }).then(() => {
      return this.query({
        queryString: `
          SELECT * FROM contribution_frequency;
        `
      })
    }).then((contributionFrequency) => {
      resolve(contributionFrequency)
    }).catch((error) => {
      this.handleError({ error, method: 'updateContributionFrequency' })
    })
  })
}
