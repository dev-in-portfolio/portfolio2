import { defineComponent, withAsyncContext, mergeProps, unref, useSSRContext } from 'vue';
import { ssrRenderAttrs, ssrInterpolate, ssrRenderList, ssrRenderAttr } from 'vue/server-renderer';
import { _ as _export_sfc, d as useRoute } from './server.mjs';
import '../nitro/nitro.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import '../routes/renderer.mjs';
import 'vue-bundle-renderer/runtime';
import 'unhead/server';
import 'devalue';
import 'unhead/utils';
import 'unhead/plugins';
import 'vue-router';

const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "[publishedSlug]",
  __ssrInlineRender: true,
  async setup(__props) {
    let __temp, __restore;
    const route = useRoute();
    const slug = route.params.publishedSlug;
    const data = ([__temp, __restore] = withAsyncContext(() => $fetch(`/api/cardpress/public/${slug}`)), __temp = await __temp, __restore(), __temp);
    const page = data.page;
    const cards = data.cards;
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "page" }, _attrs))} data-v-f5400c4b><header class="hero" data-v-f5400c4b><h1 data-v-f5400c4b>${ssrInterpolate(unref(page).title)}</h1></header><section class="stack" data-v-f5400c4b><!--[-->`);
      ssrRenderList(unref(cards), (card) => {
        _push(`<article class="card" data-v-f5400c4b><h3 data-v-f5400c4b>${ssrInterpolate(card.title)}</h3>`);
        if (card.type === "quote") {
          _push(`<p data-v-f5400c4b>\u201C${ssrInterpolate(card.body)}\u201D</p>`);
        } else {
          _push(`<p data-v-f5400c4b>${ssrInterpolate(card.body)}</p>`);
        }
        if (card.type === "image") {
          _push(`<img${ssrRenderAttr("src", card.image_url)} data-v-f5400c4b>`);
        } else {
          _push(`<!---->`);
        }
        if (card.type === "embed") {
          _push(`<iframe${ssrRenderAttr("src", card.embed_url)} data-v-f5400c4b></iframe>`);
        } else {
          _push(`<!---->`);
        }
        _push(`</article>`);
      });
      _push(`<!--]--></section></div>`);
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/p/[publishedSlug].vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const _publishedSlug_ = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-f5400c4b"]]);

export { _publishedSlug_ as default };
//# sourceMappingURL=_publishedSlug_-dc5wWuko.mjs.map
