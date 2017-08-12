import Promise from 'bluebird'

export default function milestoneCreated({ data }) {
  return new Promise((resolve, reject) => {
    console.log('milestoneCreated::data', data)
    const {
      createdBy,
      title,
      description,
      state,
      createdOn,
      updatedOn,
      dueOn,
      closedOn,
      repository,
      id
    } = data

    this.query({
      queryString: `
        CREATE TABLE IF NOT EXISTS milestones (
          id              BIGINT NOT NULL DEFAULT 0 PRIMARY KEY,
          createdBy       CHARACTER(255),
          createdOn       BIGINT NOT NULL DEFAULT 0,
          updatedOn       BIGINT NOT NULL DEFAULT 0,
          dueOn           BIGINT NOT NULL DEFAULT 0,
          closedOn        BIGINT NOT NULL DEFAULT 0,
          repository      CHARACTER(255),
          description     CHARACTER(255),
          title           CHARACTER(255),
          state           CHARACTER(255)
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
            closedOn,
            repository,
            description,
            title,
            state
          ) VALUES (
            ${id},
            "${createdBy}",
            ${createdOn},
            ${updatedOn},
            ${dueOn},
            ${closedOn},
            "${repository}",
            "${description}",
            "${title}",
            "${state}"
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
