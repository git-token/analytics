import Promise from 'bluebird'

export default function milestoneCompleted({ data }) {
  return new Promise((resolve, reject) => {
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
          INSERT INTO milestones (
            id,
            createdBy,
            createdOn,
            updatedOn,
            dueOn,
            closedOn,
            repository,
            description,
            title
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
          ) ON DUPLICATE KEY UPDATE
            state=VALUES(state),
            updatedOn=VALUES(updatedOn),
            closedOn=VALUES(closedOn);
        `
    }).then(() => {
      return this.query({
        queryString: `
          SELECT * FROM milestones;
        `
      })
    }).then((result) => {
      resolve(result)
    }).catch((error) => {
      this.handleError({ error, method: 'milestoneCompleted' })
    })
  })
}
