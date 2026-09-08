---
layout: ../layouts/PageLayout.astro
title: "歌单"
description: "我喜欢的音乐"
---

{% media audio %}
- title: 我的歌单
  list:
    - https://music.163.com/playlist?id=18169470140
- title: 收藏专辑
  list:
    - https://music.163.com/album?id=241083511
{% endmedia %}
