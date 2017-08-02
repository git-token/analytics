import Promise from 'bluebird'

export default function updateSummaryStatistics({ contribution }) {
  return new Promise((resolve, reject) => {
    const { value, reservedValue, date } = contribution
    this.query({
      queryString: `
        CREATE TABLE IF NOT EXISTS summary_statistics (
          githubOrganization   CHARACTER(66),
          contractAddress      CHARACTER(42) PRIMARY KEY,
          tokenName            CHARACTER(66),
          tokenSymbol          CHARACTER(66),
          latestContribution   BIGINT NOT NULL DEFAULT 0,
          tokenSupply          BIGINT NOT NULL DEFAULT 0,
          reservedSupply       BIGINT NOT NULL DEFAULT 0,
          percentReserved      REAL,
          tokenInflation       REAL,
          totalContributions   BIGINT NOT NULL DEFAULT 0,
          uniqueContributions  BIGINT NOT NULL DEFAULT 0,
          averageTokensPerContribution REAL
        );
      `
    }).then(() => {
      return this.query({
        queryString: `
          INSERT INTO summary_statistics (
            githubOrganization,
            contractAddress,
            tokenName,
            tokenSymbol,
            latestContribution,
            tokenSupply,
            reservedSupply,
            percentReserved,
            tokenInflation,
            totalContributions,
            uniqueContributions,
            averageTokensPerContribution
          ) VALUES (
            "${this.contractDetails['organization']}",
            "${this.contractDetails['address']}",
            "${this.contractDetails['name']}",
            "${this.contractDetails['symbol']}",
            (SELECT date FROM contributions ORDER BY date DESC limit 1),
            (SELECT sum(value)+sum(reservedValue) FROM contributions),
            (SELECT sum(reservedValue) FROM contributions),
            (SELECT 1.0*sum(reservedValue)/(sum(value)+sum(reservedValue)) FROM contributions),
            (SELECT ROUND(EXP(SUM(LOG(POW(1+periodicRate, (SELECT 1/count(*) FROM token_inflation WHERE date <= ${date}))))), 6)-1.0 FROM token_inflation WHERE date <= ${date}),
            (SELECT count(txHash) FROM contributions),
            (SELECT count(distinct username) FROM contributions),
            (SELECT sum(value+reservedValue)/count(*) FROM contributions)
          ) ON DUPLICATE KEY UPDATE
            latestContribution=VALUES(latestContribution),
            tokenSupply=VALUES(tokenSupply),
            reservedSupply=VALUES(reservedSupply),
            percentReserved=VALUES(percentReserved),
            tokenInflation=VALUES(tokenInflation),
            totalContributions=VALUES(totalContributions),
            uniqueContributions=VALUES(uniqueContributions),
            averageTokensPerContribution=VALUES(averageTokensPerContribution);
        `
      })
    }).then(() => {
      return this.query({
        queryString: `
          SELECT * FROM summary_statistics;
        `
      })
    }).then((summary) => {
      resolve(summary[0])
    }).catch((error) => {
      this.handleError({ error, method: 'updateSummaryStatistics' })
    })
  })
}
