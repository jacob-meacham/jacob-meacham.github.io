---
layout: default
header: jemonjam
group: blog
submasthead: engineer + builder + leader
---
An attempt to write a bit more about the things that interest me the most.
<ul class="posts">
  {% for post in site.posts %}
    <li>
      <div class="date">{{ post.date | date: "%B %d, %Y" }}</div>
      <a href="{{ post.url }}">{{ post.title }}</a>
    </li>
  {% endfor %}
</ul>
