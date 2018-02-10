import { test, skip } from 'qunit';
import moduleForAcceptance from '../../tests/helpers/module-for-acceptance';
import Model from 'ember-data/model';
import attr from 'ember-data/attr';
import { belongsTo, hasMany } from 'ember-data/relationships';
import { run } from '@ember/runloop';
import Changeset from 'ember-changeset';

moduleForAcceptance('Acceptance | main', {
  beforeEach: function() {
    let store = this.application.__container__.lookup('service:store');

    this.application.register('model:profile', Model.extend({
      firstName: attr('string', { defaultValue: 'Bob' }),
      lastName: attr('string', { defaultValue: 'Ross' }),
    }));

    this.application.register('model:user', Model.extend({
      profile: belongsTo('profile'),
      dogs: hasMany('dog'),
    }));

    this.application.register('model:dog', Model.extend({
      breed: attr('string', { defaultValue: 'rough collie' }),
      user: belongsTo('user'),
    }));

    run(() => {
      let profile = store.createRecord('profile');
      let user = store.createRecord('user', { profile });
      this.dummyUser = user;

      return user.get('dogs').then(() => {
        for (let i = 0; i < 2; i++) {
          user.get('dogs').addObject(store.createRecord('dog'))
        }
      });
    });
  },
});

test('it works for belongsTo relation attributes', function(assert) {
  let user = this.dummyUser;
  let changeset = new Changeset(user);

  run(() => {
    assert.equal(changeset.get('profile'), user.get('profile'));
    assert.equal(changeset.get('profile.firstName'), user.get('profile.firstName'));
    assert.equal(changeset.get('profile.lastName'), user.get('profile.lastName'));

    changeset.set('profile.firstName', 'Grace');
    changeset.set('profile.lastName', 'Hopper');

    assert.equal(changeset.get('profile.firstName'), 'Grace');
    assert.equal(changeset.get('profile.lastName'), 'Hopper');

    changeset.execute();

    assert.equal(user.get('profile.firstName'), 'Grace');
    assert.equal(user.get('profile.lastName'), 'Hopper');
  })
});


test('it works for adding hasMany relation', function(assert) {
  let store = this.application.__container__.lookup('service:store');
  let user = this.dummyUser;

  run(() => {
    let changeset = new Changeset(user);

    assert.equal(2, changeset.get('dogs.length'));
    changeset.get('dogs').addObject(store.createRecord('dog'))
    assert.equal(3, changeset.get('dogs.length'));

    changeset.execute();

    assert.equal(3, user.get('dogs.length'));
  })
});

test('it works for removing hasMany relation', function(assert) {
  let user = this.dummyUser;

  run(() => {
    let changeset = new Changeset(user);

    assert.equal(2, changeset.get('dogs.length'));
    changeset.get('dogs').popObject();
    assert.equal(1, changeset.get('dogs.length'));

    changeset.execute();

    assert.equal(1, user.get('dogs.length'));
  })
});

test('it works for belongsTo relation', function(assert) {
  let store = this.application.__container__.lookup('service:store');
  let user = this.dummyUser;

  run(() => {
    let anotherProfile = store.createRecord('profile', { firstName: 'Joe', lastName: 'Blog' });
    let changeset = new Changeset(user);

    assert.notEqual(anotherProfile.get('firstName'), user.get('profile.firstName'));
    changeset.set('profile', anotherProfile);
    assert.equal(changeset.get('profile.firstName'), anotherProfile.get('firstName'));

    changeset.execute();

    assert.equal(user.get('profile.firstName'), anotherProfile.get('firstName'));
  })
});

skip("it (doesn't) work for hasMany / firstObject", function(a) {
  a.expect(2 + 4);

  run(() => {
    let user = this.dummyUser;

    // TODO: Add special handling if content is DS.ManyArray?
    // `dogs.firstObject` is readonly.
    return user.get('dogs').then(dogs => {
      const FirstName = 'firstObject.user.profile.firstName';
      const LastName  = 'firstObject.user.profile.lastName';

      let cs = new Changeset(dogs);

      cs.set(FirstName, 'Grace');
      cs.set(LastName,  'Hopper');
      a.equal(cs.get(FirstName), 'Grace');
      a.equal(cs.get(LastName),  'Hopper');

      cs.execute();
      a.equal(user.get(FirstName), 'Grace');
      a.equal(user.get(LastName),  'Hopper');
      a.equal(user.get('profile.firstName'), 'Grace');
      a.equal(user.get('profile.lastName'),  'Hopper');
    });
  });
});
