
import version from 'lab.version';
import config from 'lab.config';

var addParam = function(string, key, value) {
  if (string.length > 0) {
    return string + "&" + key + "=" + value;
  }
  return "?" + key + "=" + value;
};

export default {
  getVersionedUrl: function() {
    if (config.versionedHome && version.repo.last_tag) {
      return config.versionedHome(version.repo.last_tag);
    }
    var host = window.location.host;
    var path = window.location.pathname;
    var search = window.location.search;
    var protocol = window.location.protocol;
    search = addParam(search, 'show_data_warning', 'true');
    return protocol + "//" + host + path + search;
  }
};
