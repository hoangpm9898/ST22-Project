
class AppResponse {
  constructor({ success, data, pagination }) {
    this.success = success;
    this.data = data;
    this.pagination = pagination;
  }
}

class AppResponsePagination {
  constructor({ has_next, per_page, current_page, total_pages, total_records }) {
    this.has_next = has_next;
    this.per_page = per_page;
    this.current_page = current_page;
    this.total_pages = total_pages;
    this.total_records = total_records;
  }
}

module.exports = { AppResponse, AppResponsePagination };