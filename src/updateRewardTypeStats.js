import Promise from 'bluebird'

export default function updateRewardTypeStats({ contribution }) {
  return new Promise((resolve, reject) => {
    const { value, reservedValue, date } = contribution
    this.query({
      queryString: `
        CREATE TABLE IF NOT EXISTS reward_type_stats (
          rewardType           CHARACTER(66) PRIMARY KEY,
          count                BIGINT NOT NULL DEFAULT 0,
          tokenCreated         BIGINT NOT NULL DEFAULT 0,
          valuePerCount        BIGINT NOT NULL DEFAULT 0,
          frequency            REAL,
          percentOfTokenSupply REAL
        );
      `
    }).then(() => {
      return this.query({
        queryString: `
          INSERT INTO reward_type_stats (
            rewardType,
            count,
            tokenCreated,
            valuePerCount,
            frequency,
            percentOfTokenSupply
          ) SELECT
            rewardType,
            count(rewardType) AS count,
            sum(value+reservedValue) AS tokensCreated,
            sum(value+reservedValue)/count(rewardType) AS valuePerCount,
            count(rewardType)/(SELECT count(*) FROM contributions) AS frequency,
            sum(value+reservedValue)/(SELECT sum(value+reservedValue) FROM contributions) AS percentOfTokenSupply
            FROM contributions
            GROUP BY rewardType
            ON DUPLICATE KEY UPDATE
            rewardType=VALUES(rewardType),
            count=VALUES(count),
            tokenCreated=VALUES(tokenCreated),
            valuePerCount=VALUES(valuePerCount),
            frequency=VALUES(frequency),
            percentOfTokenSupply=VALUES(percentOfTokenSupply)
        `
      })
    }).then(() => {
      return this.query({
        queryString: `
          SELECT * FROM reward_type_stats;
        `
      })
    }).then((data) => {
      resolve(data[0])
    }).catch((error) => {
      this.handleError({ error, method: 'updateRewardTypeStats' })
    })
  })
}
