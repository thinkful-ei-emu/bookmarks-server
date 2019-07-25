const knex = require('knex');
const app = require('../src/app');
const { makeBookmarksArray } = require('./bookmarks.fixtures.js');

describe('Bookmarks endpoints', () => {
  let db;
  before('make knex instance', () => {
    db = knex({
      client: 'pg',
      connection: process.env.TEST_DB_URL
    });

    app.set('db', db);
  });
  const testBookmarks = makeBookmarksArray();

  after('disconnect from db', () => db.destroy());
  before('clean the table', () => db('bookmarks').truncate());
  afterEach('cleanup', () => db('bookmarks').truncate());

  describe('GET /bookmarks', () => {
    context('Given no bookmarks', () => {
      it('responds with 200 and an empty list', () => {
        return supertest(app)
          .get('/bookmarks')
          .expect(200, []);
      });
    });

    context('Given there are bookmarks in the database', () => {
      beforeEach('insert bookmarks', () => {
        return db.into('bookmarks').insert(testBookmarks);
      });

      it('responds with 200 and all of the bookmarks', () => {
        return supertest(app)
          .get('/bookmarks')
          .expect(200, testBookmarks);
      });
    });
  });

  describe('GET /bookmarks/:id', () => {
    context('Given no bookmarks', () => {
      it('responds with 404', () => {
        const bookmarkId = 123;
        return supertest(app)
          .get(`/bookmarks/${bookmarkId}`)
          .expect(404, { error: { message: 'Bookmark doesn\'t exist' } });
      });
    });

    context('Given there are bookmarks in the database', () => {
      context('Given an xss attack bookmark', () => {
        const maliciousBookmark = {
          id: 235346,
          title: 'Naughty naughty very naughty <script>alert("xss");</script>',
          url: 'Naughtysite.come',
          description:
            'Bad image <img src="https://url.to.file.which/does-not-exist" onerror="alert(document.cookie);">. But not <strong>all</strong> bad.',
          rating: 5
        };

        beforeEach('insert malicious bookmark', () => {
          return db.into('bookmarks').insert([maliciousBookmark]);
        });

        it('removes xss attack content', () => {
          return supertest(app)
            .get(`/bookmarks/${maliciousBookmark.id}`)
            .expect(200)
            .expect(res => {
              expect(res.body.title).to.eql(
                'Naughty naughty very naughty &lt;script&gt;alert("xss");&lt;/script&gt;'
              );
              expect(res.body.description).to.eql(
                'Bad image <img src="https://url.to.file.which/does-not-exist">. But not <strong>all</strong> bad.'
              );
            });
        });
      });

      beforeEach('insert bookmarks', () => {
        return db.into('bookmarks').insert(testBookmarks);
      });

      it('responds with 200 and the specified bookmark', () => {
        const bookmarkId = 2;
        const expectedBookmark = testBookmarks[bookmarkId - 1];
        return supertest(app)
          .get(`/bookmarks/${bookmarkId}`)
          .expect(200, expectedBookmark);
      });
    });
  });

  describe('POST /bookmarks', () => {
    it('creates an bookmark, responding with 201 and new bookmark', function() {
      this.retries(3);
      const newBookmark = {
        title: 'Test new bookmark',
        description: 'the best bookmark ever',
        rating: 5,
        url: 'wow.com'
      };

      return supertest(app)
        .post('/bookmarks')
        .send(newBookmark)
        .expect(201)
        .expect(res => {
          expect(res.body.title).to.eql(newBookmark.title);
          expect(res.body.description).to.eql(newBookmark.description);
          expect(res.body.rating).to.eql(newBookmark.rating);
          expect(res.body.url).to.eql(newBookmark.url);
          expect(res.body).to.have.property('id');
          expect(res.headers.location).to.eql(`http://localhost:8000/bookmarks/${res.body.id}`);
        })
        .then(postRes =>
          supertest(app)
            .get(`/bookmarks/${postRes.body.id}`)
            .expect(postRes.body)
        );
    });

    const requiredFields = ['title', 'rating', 'url'];

    requiredFields.forEach(field => {
      const newBookmark = {
        title: 'Test new bookmark',
        description: 'the best bookmark ever',
        rating: 5,
        url: 'wow.com'
      };

      it(`responds with 400 and an error message when '${field}' is missing`, () => {
        delete newBookmark[field];

        return supertest(app)
          .post('/bookmarks')
          .send(newBookmark)
          .expect(400, {
            error: { message: `Missing '${field}' in request body` }
          });
      });
    });
  });

  describe('Delete /bookmarks/::bookmark_id', () => {
    context('given no bookmarks', () => {
      it('responds with 404', () => {
        const bookmarkId = 123123;
        console.log('test id', bookmarkId);
        return supertest(app)
          .delete(`/bookmarks/${bookmarkId}`)
          .expect(404, { error: { message: 'Bookmark doesn\'t exist' } });
      });
    });

    context('Given there are bookmarks in the database', () => {
      beforeEach('insert bookmarks', () => {
        return db.into('bookmarks').insert(testBookmarks);
      });

      it('responds with 204 and removes the bookmark', () => {
        const idToRemove = 2;
        const expectedBookmarks = testBookmarks.filter(
          bookmark => bookmark.id !== idToRemove
        );

        return supertest(app)
          .delete(`/bookmarks/${idToRemove}`)
          .expect(204)
          .then(res =>
            supertest(app)
              .get('/bookmarks')
              .expect(expectedBookmarks)
          );
      });
    });
  });
});
