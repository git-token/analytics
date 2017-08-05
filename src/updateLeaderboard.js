import Promise from 'bluebird'

export default function updateLeaderboard({ contribution }) {
  return new Promise((resolve, reject) => {
    const { username, contributor } = contribution
    this.query({ queryString: `
      CREATE TABLE IF NOT EXISTS leaderboard (
        username             CHARACTER(42) PRIMARY KEY,
        contributorAddress   CHARACTER(42),
        value                BIGINT NOT NULL DEFAULT 0,
        latestContribution   BIGINT NOT NULL DEFAULT 0,
        numContributions     BIGINT NOT NULL DEFAULT 0,
        valuePerContribution REAL,
        percentTokenCreation REAL
      );
    `}).then(() => {
      return this.query({ queryString: `
          INSERT INTO leaderboard (
            username,
            contributorAddress,
            value,
            latestContribution,
            numContributions,
            valuePerContribution,
            percentTokenCreation
          ) VALUES (
            "${username}",
            "${contribution['contributor']}",
            (SELECT sum(value+reservedValue) FROM contributions WHERE username = "${username}"),
            (SELECT max(date) FROM contributions WHERE username = "${username}"),
            (SELECT count(*) FROM contributions WHERE username = "${username}"),
            (SELECT sum(value+reservedValue)/count(*) FROM contributions WHERE username = "${username}"),
            (SELECT 1.0*sum(value+reservedValue)/(select sum(value+reservedValue) from contributions) FROM contributions WHERE username = "${username}")
          ) ON DUPLICATE KEY UPDATE
            value=VALUES(value),
            latestContribution=VALUES(latestContribution),
            numContributions=VALUES(numContributions),
            valuePerContribution=VALUES(valuePerContribution),
            percentTokenCreation=VALUES(percentTokenCreation)
          ;
        ` })
     }).then(() => {
      // Replace "0x0" with contract address;
      return this.query({ queryString: `
          INSERT INTO leaderboard (
            username,
            contributorAddress,
            value,
            latestContribution,
            numContributions,
            valuePerContribution,
            percentTokenCreation
          ) VALUES (
            "Total",
            "${this.contractDetails['address']}",
            (SELECT sum(value+reservedValue) FROM contributions),
            (SELECT max(date) FROM contributions),
            (SELECT count(*) FROM contributions),
            (SELECT (sum(value+reservedValue))/count(*) FROM contributions),
            (SELECT 1.0*(sum(value+reservedValue))/(sum(value+reservedValue)) FROM contributions)
          ) ON DUPLICATE KEY UPDATE
            value=VALUES(value),
            latestContribution=VALUES(latestContribution),
            numContributions=VALUES(numContributions),
            valuePerContribution=VALUES(valuePerContribution),
            percentTokenCreation=VALUES(percentTokenCreation)
          ;
        `
      })
    }).then(() => {
      return this.query({ queryString: `
        SELECT * FROM leaderboard;
      ` })
    }).then((leaderboard) => {
      resolve(leaderboard)
    }).catch((error) => {
      this.handleError({ error, method: 'updateLeaderboard' })
    })
  })
}
