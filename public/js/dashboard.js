const TypeX = {
    currentImagePage: 0,
    pagedNumbers: [],
    currentID: null
}
function whitespace(str) {
    return str === null || str.match(/^ *$/) !== null;
}

function showAlert(type, message) {
    if (type === 'error') {
        Swal.fire({
            icon: 'error',
            title: 'Oops...',
            text: message,
            footer: 'Try again later...'
        })
    } else if (type === 'success') {
        Swal.fire({
            icon: 'success',
            title: 'Success',
            text: message,
            footer: 'You did it!'
        })
    }
}

function copyText(text) {
    var input = document.createElement('textarea');
    input.innerHTML = text;
    document.body.appendChild(input);
    input.select();
    var result = document.execCommand('copy');
    document.body.removeChild(input);
    return result;
}

async function redoImageGrid(page, mode = null) {
    if (!page && !mode) return;
    document.getElementById('typexImages').innerHTML = '';
    let url = '';
    if (mode === 'prev') {
        if (TypeX.currentImagePage === 0) {
            url = '/api/images/user/pages?page=0';
            TypeX.currentImagePage = 0;
        } else {
            url = `/api/images/user/pages?page=${TypeX.currentImagePage - 1}`;
            TypeX.currentImagePage--;
        } //could be better :DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD
    } else if (mode === 'next') {
        if (TypeX.pagedNumbers[TypeX.pagedNumbers.length - 1] <= TypeX.currentImagePage + 1) {
            url = `/api/images/user/pages?page=${TypeX.pagedNumbers[TypeX.pagedNumbers.length - 1]}`
            TypeX.currentImagePage = TypeX.pagedNumbers[TypeX.pagedNumbers.length - 1];
        } else {
            url = `/api/images/user/pages?page=${TypeX.currentImagePage + 1}`
            TypeX.currentImagePage++;
        }
    } else if (mode === 'normal') {
        url = `/api/images/user/pages?page=${page}`;
        TypeX.currentImagePage = Number(page);
    }
    $("#typexImagePaginationDropdown").val(TypeX.currentImagePage);
    const resp = await fetch(url, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    });
    const json = await resp.json();
    if (json.error || json.code) return showAlert('error', json.error);
    try {
        json.page.forEach(image => {
            console.log(image)
            $('#typexImages').append(`
<div class="column col-4">
<div class="card">
  <div class="card-image">
    <img src="${image.url}" class="img-responsive" onclick="document.getElementById('modal-image-mngt-${image.id}').classList.add('active')">
    <div class="modal" id="modal-image-mngt-${image.id}">
    <a href="#close" class="modal-overlay" aria-label="Close" onclick="document.getElementById('modal-image-mngt-${image.id}').classList.remove('active')"></a>
    <div class="modal-container bg-dark">
            <div class="modal-header">
                <a href="#close" class="btn btn-clear float-right text-light" aria-label="Close"  onclick="document.getElementById('modal-image-mngt-${image.id}').classList.remove('active')"></a>
                <div class="modal-title text-light h5">Manage Image ${image.id}</div>
            </div>
            <div class="modal-body">
                This image is viewable at <a href="${image.url}">${image.url}</a> and has <b>${image.views}</b> views.
            </div>
            <div class="modal-footer">
                <button class="btn btn-primary" type="button" onclick="deleteImage('${image.id}')">Delete Image</button>
            </div>
        </div>
    </div>
  </div>
</div>
</div>
    `);
        });
    } catch (e) {
        document.getElementById('emptyImages').innerHTML = `
        <div class="empty bg-dark">
  <div class="empty-icon">
    <i class="icon icon-photo"></i>
  </div>
  <p class="empty-title h5">You have no imaages</p>
  <p class="empty-subtitle">Use the API to start uploading!</p>
</div>
        `;
        document.getElementById('typexImagePagination').innerHTML = '';
    }
}

document.getElementById('updateImages').addEventListener('click', async () => {
    redoImageGrid('0', 'normal');
    document.getElementById('emptyImages').innerHTML = '';
    document.getElementById('typexImagePagination').innerHTML = '';

    const resp = await fetch('/api/images/user/pages', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    });
    const json = await resp.json();
    try {
        $('#typexImagePagination').append(`
<li class="page-item">
  <a class="page-link" aria-label="First" onclick="redoImageGrid('0', 'normal')">
    First
  </a>
</li>`);
        $('#typexImagePagination').append(`
<li class="page-item">
    <a class="page-link" aria-label="Previous" onclick="redoImageGrid(null, 'prev')">
       Prev
    </a>
</li>`);
        $('#typexImagePagination').append(`
<li class="page-item">
    <select class="form-select" id="typexImagePaginationDropdown">
    </select>
</li>`)
        TypeX.pagedNumbers = json.pagedNums;
        json.pagedNums.forEach(p => {
            $('#typexImagePaginationDropdown').append(`
                <option onclick="redoImageGrid('${p}', 'normal')" value="${p}">${p + 1}</option>
                `)
        });
        $('#typexImagePagination').append(`
<li class="page-item">
    <a onclick="redoImageGrid(null, 'next')">
        Next
    </a>
</li>`);
        $('#typexImagePagination').append(`
<li class="page-item">
  <a onclick="redoImageGrid(TypeX.pagedNumbers[TypeX.pagedNumbers.length-1], 'normal')">
    Last
  </a>
</li>`);
    } catch (e) {
        console.error(e)
    }
});

document.getElementById('updateStatistics').addEventListener('click', async () => {
    const resp = await fetch('/api/images/statistics', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    });
    const json = await resp.json();
    try {
        document.getElementById('statsDescription').innerHTML = `You have an average of <b>${Math.floor(json.average).toLocaleString()} views</b> on your images, you have <b>${json.totalViews.toLocaleString()} views total</b>, you currently have <b>${json.images.toLocaleString()} images</b>!`
        document.getElementById('statsLeaderboardImages').innerHTML = '';
        document.getElementById('statsLeaderboardImageViews').innerHTML = '';
        for (let i = 0; i < json.table.images.length; i++) {
            const c = json.table.images[i];
            $('#statsLeaderboardImages').append(`
            <tr>
            <th>${i + 1}</th>
            <td>${c.username}</td>
            <td>${c.count.toLocaleString()}</td>
            </tr>
            `)
        }
        for (let i = 0; i < json.table.views.length; i++) {
            const c = json.table.views[i];
            $('#statsLeaderboardImageViews').append(`
            <tr>
            <th>${i + 1}</th>
            <td>${c.username}</td>
            <td>${c.count.toLocaleString()}</td>
            </tr>
            `)
        }
    } catch (e) {
        console.error(e)
    }
});

document.getElementById('updateShortens').addEventListener('click', async () => {
    const resp = await fetch('/api/shortens', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    });
    const json = await resp.json();
    try {
        document.getElementById('shortensTableShortens').innerHTML = '';
        for (const shorten of json) {
            $('#shortensTableShortens').append(`
            <tr>
            <th>${shorten.id}</th>
            <td><a href="${shorten.origin}">${shorten.origin}</a></td>
            <td><a href="${shorten.url}">${shorten.url}</a></td>
            </tr>
            `)
        }
    } catch (e) {
        console.error(e)
    }
});


const deleteImage = (id, url) => {
    Swal.fire({
        title: 'Are you sure?',
        text: `You are proceeding to delete image (${id}), you will not be able to recover it!`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, delete it.'
    }).then(async (result) => {
        if (result.value) {
            try {
                const res = await fetch('/api/images/' + id, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                try {
                    const json = await res.json();
                    if (json.error || json.code) return showAlert('error', json.error)
                    else {
                        Swal.fire(
                            'Deleted!',
                            `Deleted image (${id}) successfully.`,
                            'success'
                        );
                        document.getElementById(`modal-image-mngt-${id}`).classList.remove('active')
                        redoImageGrid('0', 'normal')
                    }
                } catch (e) {
                    console.error(e)
                }
            } catch (e) {
                console.error(e)
            }
        }
    });
}
const deleteSpecificUser = (id, username) => {
    Swal.fire({
        title: 'Are you sure?',
        text: `You are proceeding to delete user ${username} (${id}), you will not be able to recover them!`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: `Yes, delete ${username}.`
    }).then(async (result) => {
        if (result.value) {
            try {
                const res = await fetch('/api/user/' + id, {
                    method: 'DELETE'
                });
                try {
                    const json = await res.json();
                    if (json.error || json.code) return showAlert('error', json.error)
                    else {
                        Swal.fire(
                            'Deleted!',
                            `Deleted user ${username} (${id}) successfully.`,
                            'success'
                        );
                        window.location.href = '/'
                    }
                } catch (e) {
                    console.error(e)
                }
            } catch (e) {
                console.error(e)
            }
        }
    });
}
const saveUser = (id) => {
    Swal.fire({
        title: 'Are you sure?',
        text: "You are proceeding to edit your user.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, save changes!'
    }).then(async (result) => {
        if (result.value) {
            const username = document.getElementById('usernameSave').value;
            const password = document.getElementById('passwordSave').value;
            if (whitespace(username)) return showAlert('error', 'Please input a username.')
            const res = await fetch(`/api/users/${id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    payload: 'USER_EDIT',
                    username,
                    password
                })
            });
            try {
                const json = await res.json();
                if (json.error || json.code) return showAlert('error', json.error)
                else {
                    Swal.fire(
                        'Saved Changes!',
                        'Changes were saved successfully!',
                        'success'
                    );
                    window.location.href = '/'
                }
            } catch (e) {
                console.error(e)
            }
        }
    });
};

async function shortURL(token, url) {
    if (whitespace(url)) return showAlert('error', 'Please input a URL.')
    const res = await fetch('/api/shorten', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'authorization': token
        },
        body: JSON.stringify({
            url
        })
    });
    try {
        let te = await res.text();
        Swal.fire(
            'URL Shortened!',
            `Shorten: <a target="_blank" href="${te}">${te}</a>`,
            'success'
        );
        return;
    } catch (e) {
        if (e.message.startsWith('Unexpected token < in JSON at position')) {
            let te = await res.text();
            Swal.fire(
                'URL Shortened!',
                `Shorten: <a target="_blank" href="${te}">${te}</a>`,
                'success'
            );
            return;
        } else {
            console.error(e)
        }
    }
};

const copyToken = (token) => {
    Swal.fire({
        title: 'Are you sure?',
        text: "You are proceeding to copy your token, make sure NO ONE sees it.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3`085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, copy it!'
    }).then((result) => {
        if (result.value) {
            copyText(token);
            Swal.fire(
                'Copied!',
                'Your API Token has been copied.',
                'success'
            );
        }
    });
};
function regenToken(id) {
    Swal.fire({
        title: 'Are you sure?',
        text: "You are proceeding to regenerate your token, remember all apps using your current one will stop working.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, regenerate it!'
    }).then(async (result) => {
        if (result.value) {
            console.log(`/api/users/${id}`);
            const res = await fetch(`/api/users/${id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    payload: 'USER_TOKEN_RESET'
                })
            });
            try {
                const json = await res.json();
                if (json.error || json.code) return showAlert('error', json.error)
                else {
                    Swal.fire(
                        'Regenerated!',
                        'Your API Token has been regenerated.',
                        'success'
                    );
                    return window.location.href = '/'
                }
            } catch (e) {
                console.error(e)
            }

        }
    });

};
async function createUser() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    if (whitespace(username)) return showAlert('error', 'Please input a username.')
    const res = await fetch('/api/users', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            username,
            password,
            administrator: document.getElementById('administrator').checked
        })
    });
    try {
        const json = await res.json();
        if (json.error || json.code) return showAlert('error', json.error)
        else {
            showAlert('success', `Created user ${json.username} (${json.id})`)
            return window.location.href = '/'
        }
    } catch (e) {
        console.error(e)
    }
}

document.getElementById('addUser').addEventListener('click', async () => {
    if (document.getElementById('administrator').checked) {
        Swal.fire({
            title: 'Are you sure?',
            text: "You are proceeding to create a user with administrator permissions, they can do whatever they want!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, create user!'
        }).then(async (result) => {
            if (result.value) {
                createUser()
            }
        });
    } else {
        createUser();
    }
})