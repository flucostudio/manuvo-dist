/*!
 * Posts Filter — Finsweet CMS Filter labels, pills and the
 * Featured / All projects switch.
 * Replaces: posts-filter-new.js (current) and posts-filter.js (legacy)
 * Requires: shared/fluco-core.js, Finsweet Attributes cmsfilter (v1)
 */
(function (window, document) {
  'use strict';

  var F = window.Fluco;
  if (!F) {
    console.error('[posts-filter] Fluco core is missing. Load shared/fluco-core.js first.');
    return;
  }

  var qs = F.dom.qs;
  var qsa = F.dom.qsa;

  // Filter groups in the order Finsweet reports them (`filtersData` index)
  // and the field key we try to match first.
  var GROUPS = [
    { name: 'categories', selector: '.filter-group-category', key: 'category', index: 0 },
    { name: 'year', selector: '.filter-group-year', key: 'year', index: 1 },
    { name: 'location', selector: '.filter-group-location', key: 'location', index: 2 }
  ];

  var TABS = { featured: 'Featured', all: 'All projects' };

  function Filter() {
    this.title = qsa('.portfolio-filters-label')[0] || null;
    this.defaultTitle = this.title ? this.title.textContent : '';
    this.activeTab = TABS.featured;
    this.hasActiveFilter = false;

    this.collections = {
      featured: qs('.collection-projects.featured'),
      all: qs('.collection-projects.all')
    };
    this.forms = {
      featured: qs('.portfolio-filters-form-block.featured'),
      all: qs('.portfolio-filters-form-block.all')
    };
    this.featuredGroup = qs('.filter-group-featured');

    this.groups = GROUPS.map(function (g) {
      var root = qs(g.selector);
      if (!root) return null;
      var dropdown = qs('.portfolio-filters-dropdown', root);
      var label = dropdown ? qs('.portfolio-filters-label', dropdown) : null;
      return {
        name: g.name,
        key: g.key,
        index: g.index,
        root: root,
        dropdown: dropdown,
        label: label,
        defaultLabel: label ? label.textContent : '',
        pill: qs('.filter-pill', root),
        pillLabel: qs('.filter-pill-label', root)
      };
    }).filter(Boolean);

    this.bindTabs();
    this.bindFinsweet();
  }

  /* ---------- Featured / All switch ---------- */

  Filter.prototype.bindTabs = function () {
    if (!this.featuredGroup) return;
    var items = qsa('.portfolio-filters-checkbox-label', this.featuredGroup);
    var allItem = items[0];
    var featuredItem = items[1];
    if (!allItem || !featuredItem) return;

    var self = this;
    this.tabButtons = { all: allItem, featured: featuredItem };
    featuredItem.style.display = 'none';

    F.on(allItem, 'click', function () {
      self.showTab('all');
    });
    F.on(featuredItem, 'click', function () {
      self.showTab('featured');
    });
  };

  Filter.prototype.showTab = function (tab) {
    var other = tab === 'all' ? 'featured' : 'all';
    this.activeTab = TABS[tab];

    show(this.collections[tab]);
    hide(this.collections[other]);
    show(this.forms[tab]);
    hide(this.forms[other]);

    if (this.tabButtons) {
      hide(this.tabButtons[tab]);
      show(this.tabButtons[other]);
    }
    this.updateTitle();
  };

  Filter.prototype.updateTitle = function () {
    if (!this.title) return;
    this.title.textContent = this.hasActiveFilter && this.activeTab === TABS.all ? 'Showing:' : this.activeTab;
  };

  /* ---------- Finsweet ---------- */

  Filter.prototype.bindFinsweet = function () {
    var self = this;
    window.fsAttributes = window.fsAttributes || [];
    window.fsAttributes.push([
      'cmsfilter',
      function (instances) {
        var instance = self.pickInstance(instances);
        if (!instance) return;
        instance.listInstance.on('renderitems', function () {
          self.onRender(instance);
        });
        // Labels for the initial render (Finsweet fires renderitems lazily).
        self.onRender(instance);
      }
    ]);
  };

  /** The instance bound to the "all projects" list, index 1 as fallback. */
  Filter.prototype.pickInstance = function (instances) {
    if (!instances || !instances.length) return null;
    var allRoot = this.collections.all;
    if (allRoot) {
      for (var i = 0; i < instances.length; i++) {
        var list = instances[i].listInstance;
        var node = list && (list.wrapper || list.list);
        if (node && allRoot.contains(node)) return instances[i];
      }
    }
    return instances[1] || instances[0];
  };

  Filter.prototype.onRender = function (instance) {
    var data = instance.filtersData || [];
    this.hasActiveFilter = data.some(function (d) {
      return d.values && d.values.size === 1;
    });
    this.updateTitle();

    this.groups.forEach(function (group) {
      var entry = findFilterData(data, group);
      var value = entry && entry.values ? Array.from(entry.values)[0] : undefined;
      this.renderGroup(group, value);
    }, this);
  };

  Filter.prototype.renderGroup = function (group, value) {
    if (!group.pill) return;
    var active = value !== undefined && value !== '';
    var text = active ? value : group.defaultLabel;

    if (group.dropdown) group.dropdown.style.display = active ? 'none' : 'flex';
    group.pill.style.display = active ? 'flex' : 'none';
    // textContent, not innerHTML: values come from CMS content.
    if (group.label) group.label.textContent = text;
    if (group.pillLabel) group.pillLabel.textContent = text;
  };

  function findFilterData(data, group) {
    for (var i = 0; i < data.length; i++) {
      var keys = data[i].filterKeys || [];
      for (var k = 0; k < keys.length; k++) {
        if (String(keys[k]).toLowerCase().indexOf(group.key) !== -1) return data[i];
      }
    }
    return data[group.index] || null;
  }

  function show(node) {
    if (node) node.style.display = 'block';
  }
  function hide(node) {
    if (node) node.style.display = 'none';
  }

  F.ready(function () {
    window.Fluco.postsFilter = new Filter();
  }, 'posts-filter');
})(window, document);
