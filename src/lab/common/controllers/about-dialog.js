import markdownToHTML from "common/markdown-to-html";
import inherit from "common/inherit";
import BasicDialog from "common/controllers/basic-dialog";


/**
 * About Dialog. Inherits from Basic Dialog.
 *
 * @constructor
 */
function AboutDialog(parentSelector, i18n, interactive) {
  BasicDialog.call(this, {
    dialogClass: "about-dialog",
    appendTo: parentSelector
  }, i18n);
  this._i18n = i18n;
  if (interactive) {
    this.update(interactive);
  }
}

inherit(AboutDialog, BasicDialog);

/**
 * Updates dialog content using interactive JSON definition.
 *
 * @param {Object} interactive Interactive JSON definition.
 */
AboutDialog.prototype.update = function (interactive) {
  var $aboutContent = $("<div>");

  this.set("title", this._i18n.t("about_dialog.title", {
    interactive_title: interactive.title
  }));

  if (interactive.subtitle) {
    // Bold the subtitle using markdown (**).
    $aboutContent.append(markdownToHTML("**" + interactive.subtitle + "**"));
  }
  $aboutContent.append(markdownToHTML(interactive.about));

  this.setContent($aboutContent);
};

export default AboutDialog;
