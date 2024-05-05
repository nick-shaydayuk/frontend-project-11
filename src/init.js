import 'bootstrap';
import * as yup from 'yup';
import axios from 'axios';
import differenceWith from 'lodash/differenceWith.js';
import uniqueId from 'lodash/uniqueId.js';
import i18next from 'i18next';

import locale from './locales/yupLocale.js';
import resources from './locales/index.js';
import parse from './rss.js';
import watch from './watchers.js';

const fetchingTimeout = 5000;
const addProxy = (url) => {
  const urlWithProxy = new URL('/get', 'https://allorigins.hexlet.app');
  urlWithProxy.searchParams.set('url', url);
  urlWithProxy.searchParams.set('disableCache', 'true');
  return urlWithProxy.toString();
};

const getLoadingProcessErrorType = (e) => {
  if (e.isParsingError) {
    return 'noRss';
  }
  if (e.isAxiosError) {
    return 'network';
  }
  return 'unknown';
};

const fetchNewPosts = (watchedState) => {
  const promises = watchedState.feeds.map((feed) => {
    const urlWithProxy = addProxy(feed.url);
    return axios
      .get(urlWithProxy)
      .then((response) => {
        const feedData = parse(response.data.contents);
        const newPosts = feedData.items.map((item) => ({
          ...item,
          channelId: feed.id,
        }));
        const oldPosts = watchedState.posts.filter(
          (post) => post.channelId === feed.id,
        );
        const posts = differenceWith(
          newPosts,
          oldPosts,
          (p1, p2) => p1.title === p2.title,
        ).map((post) => ({ ...post, id: uniqueId() }));
        watchedState.posts.unshift(...posts);
      })
      .catch((e) => {
        console.error(e);
      });
  });
  Promise.all(promises).finally(() => {
    setTimeout(() => fetchNewPosts(watchedState), fetchingTimeout);
  });
};

const loadRss = (watchedState, url) => {
  watchedState.loadingProcess.status = 'loading';
  const urlWithProxy = addProxy(url);
  return axios
    .get(urlWithProxy, { timeout: 10000 })
    .then((response) => {
      const data = parse(response.data.contents);
      const feed = {
        url,
        id: uniqueId(),
        title: data.title,
        description: data.descrpition,
      };
      const posts = data.items.map((item) => ({
        ...item,
        channelId: feed.id,
        id: uniqueId(),
      }));
      watchedState.posts.unshift(...posts);
      watchedState.feeds.unshift(feed);

      watchedState.loadingProcess.error = null;
      watchedState.loadingProcess.status = 'idle';
      watchedState.form = {
        ...watchedState.form,
        status: 'filling',
        error: null,
      };
    })
    .catch((e) => {
      console.log(e);
      watchedState.loadingProcess.error = getLoadingProcessErrorType(e);
      watchedState.loadingProcess.status = 'failed';
    });
};

export default () => {
  const elements = {
    form: document.querySelector('.rss-form'),
    input: document.querySelector('.rss-form input'),
    feedback: document.querySelector('.feedback'),
    submit: document.querySelector('.rss-form button[type="submit"]'),
    feedsBox: document.querySelector('.feeds'),
    postsBox: document.querySelector('.posts'),
    modal: document.querySelector('#modal'),
  };

  const initState = {
    feeds: [],
    posts: [],
    loadingProcess: {
      status: 'idle',
      error: null,
    },
    form: {
      error: null,
      status: 'filling',
      valid: false,
    },
    modal: {
      postId: null,
    },
    ui: {
      seenPosts: new Set(),
    },
  };

  const i18nextInstance = i18next.createInstance();

  const promise = i18nextInstance
    .init({
      lng: 'ru',
      debug: false,
      resources,
    })
    .then(() => {
      yup.setLocale(locale);
      const baseUrlSchema = yup.string().url().required();

      const validateUrl = (url, feeds) => {
        const feedUrls = feeds.map((feed) => feed.url);
        const actualUrlSchema = baseUrlSchema.notOneOf(feedUrls);
        return actualUrlSchema
          .validate(url)
          .then(() => null)
          .catch((e) => e.message);
      };
      const watchedState = watch(elements, initState, i18nextInstance);

      elements.form.addEventListener('submit', (e) => {
        e.preventDefault();
        const data = new FormData(e.target);
        const sourceUrl = data.get('url');
        const url = sourceUrl.replace(/\/$/, '');

        validateUrl(url, watchedState.feeds).then((error) => {
          if (!error) {
            watchedState.form = {
              ...watchedState.form,
              valid: true,
              error: null,
            };
            loadRss(watchedState, url);
          } else {
            watchedState.form = {
              ...watchedState.form,
              valid: false,
              error: error.key,
            };
          }
        });
      });

      elements.postsBox.addEventListener('click', (evt) => {
        if (!('id' in evt.target.dataset)) {
          return;
        }

        const { id } = evt.target.dataset;
        watchedState.modal.postId = String(id);
        watchedState.ui.seenPosts.add(id);
      });

      setTimeout(() => fetchNewPosts(watchedState), fetchingTimeout);
    });

  return promise;
};
