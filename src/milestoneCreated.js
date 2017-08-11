import Promise from 'bluebird'

export default function milestoneCreated({ data }) {
  return new Promise((resolve, reject) => {
    console.log('milestoneCreated::data', data)
    const {
      createdBy,
      title,
      description,
      createdOn,
      updatedOn,
      dueOn,
      repository,
      id
    } = data

    this.query({
      queryString: `
        CREATE TABLE IF NOT EXISTS milestones (
          id              BIGINT NOT NULL DEFAULT 0 PRIMARY KEY,
          createdBy       TEXT,
          createdOn       BIGINT NOT NULL DEFAULT 0,
          updatedOn       BIGINT NOT NULL DEFAULT 0,
          dueOn           BIGINT NOT NULL DEFAULT 0,
          repository      TEXT,
          description     TEXT,
          title           TEXT
        ) ENGINE = INNODB;
      `,
    }).then(() => {
      return this.query({
        queryString: `
          INSERT INTO milestones (
            id,
            createdBy,
            createdOn,
            updatedOn,
            dueOn,
            repository,
            description,
            title
          ) VALUES (
            ${id},
            "${createdBy}",
            ${createdOn},
            ${updatedOn},
            ${dueOn},
            "${repository}",
            "${description}",
            "${title}"
          );
        `
      })
    }).then(() => {
      return this.query({
        queryString: `
          SELECT * FROM milestones;
        `
      })
    }).then((result) => {
      resolve(result)
    }).catch((error) => {
      this.handleError({ error, method: 'milestoneCreated' })
    })
  })
}
