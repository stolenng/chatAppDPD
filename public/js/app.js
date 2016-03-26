var chatApp = angular.module('ChatApp', ['ui.router', 'dpd', 'ngCookies']);

chatApp.value('dpdConfig', {
    collections: ['users', 'messages'],
    serverRoot: 'http://localhost:2403/', // optional, defaults to same server
    socketOptions: {reconnectionDelayMax: 3000}, // optional socket io additional configuration
    useSocketIo: true, // optional, defaults to false
    noCache: true // optional, defaults to false (false means that caching is enabled, true means it disabled)
});


chatApp.config(['$stateProvider', '$urlRouterProvider', function ($stateProvider, $urlRouterProvider) {

    $urlRouterProvider.otherwise('/home');

    $stateProvider
        .state('home', {
            url: '/home',
            templateUrl: 'templates/loginForm.html'
        })
        .state('register', {
            url: '/register',
            templateUrl: 'templates/registerForm.html'
        })
        .state('chat', {
            url: '/chat',
            templateUrl: 'templates/chat.html'
        });

}]);

chatApp.service('$messages', ['$q', 'dpd', function ($q, dpd) {

    this.getAllMessages = function () {
        return dpd.messages.get();
    };

    this.sendMessage = function (msg, userid) {
        return dpd.messages.post({"text": msg, "userID": userid});
    };


}]);


chatApp.service('$users', ['$q', 'dpd', '$cookies', '$http', function ($q, dpd, $cookies, $http) {

    //Function Get User Name And Password And Logs in
    this.login = function (Username, Pass) {
        var defer = $q.defer();
        $http.post('/users/login', {
            username: Username,
            password: Pass
        }).success(function (UserSession) {
            $cookies.sid = UserSession.id;
            defer.resolve();
        });
        return defer.promise;
    };

    //Function Gets Id Disconnects User
    this.disconnect = function (id) {
        var defer = $q.defer();
        dpd.users.get('logout').success(function () {
            dpd.users.put(id, {"connected": false}).success(function () {
                defer.resolve();
            });

        });
        return defer.promise;
    };

    //Function Returns Promise With User
    this.isLogged = function () {
        return dpd.users.get('me');
    };

    //Register User - returns true if success
    this.register = function (name, pass) {
        return dpd.users.post({"username": name, "password": pass});
    };
}]);


chatApp.controller('registerController', function ($scope, $users, $state) {
    //Go Back To Log In
    $scope.back = function () {
        $state.go('home');
    }
    //Submit Register Form And Log In
    $scope.submit = function () {
        if ($scope.password != $scope.password2) {
            alert("password doesnt match");
        }
        else {
            $users.Register($scope.username, $scope.password).then(function (result) {
                $users.Login($scope.username, $scope.password).then(function (result) {
                    $state.go('chat');
                });
            }, function (err) {
                alert(err.message);
            });
        }

    };
});


chatApp.controller('chatController', ['dpd', '$state', '$messages', '$users', '$scope', '$timeout',
    function (dpd, $state, $messages, $users, $scope, $timeout) {

        $scope.user = {};
        $scope.messages = [];

        //Checks If User Is Connected
        $users.isLogged().then(function (result) {
            if (!result.data) {
                $state.go('home');
            }
            $scope.user = result.data;
        }, function (err) {
            alert("user Not Logged");
        });

        //Reset Messages
        $messages.getAllMessages().then(function (result) {

            $scope.messages = result.data;
        });

        //Function To Scroll Chat
        $scope.scrollChat = function () {
            var chat = document.getElementById('chat');
            $("#chat").animate({scrollTop: chat.scrollHeight}, "slow");
        };

        //Scroll Chat On Init
        $timeout(function () {
            $scope.scrollChat();
        }, 55);

        //Update Messages
        dpd.on($scope, "msgCreated", function (result) {
            $messages.getAllMessages().then(function (result) {
                $scope.messages = result.data;
                $scope.scrollChat();
            })
        });

        //Disconnect User
        $scope.disconnect = function () {
            $users.disconnect($scope.user.id).then(function () {
                $state.go('home');
            });
        };

        //Send Message To Chat
        $scope.addMessage = function () {
            $messages.sendMessage($scope.message, $scope.user.id).then(function () {
                $scope.message = "";
            });
        }


    }]);


chatApp.controller('usersController', ['$scope', '$users', '$state', function ($scope, $users, $state) {

    //Go To Register State
    $scope.register = function () {
        $state.go('register');
    }
    //Log In User
    $scope.login = function () {
        $users.login($scope.username, $scope.password).then(function (result) {
            $state.go('chat');
        });
    }

}]);

chatApp.run(['$rootScope', '$users', function ($rootScope, $users) {

    $rootScope.$on('$stateChangeStart',
        function (event, toState, toParams, fromState, fromParams) {
            if (toState.name == 'chat') {
                $users.isLogged().then(function (result) {
                    if (!result.data) {
                        $state.go('home');
                    }
                    else {
                        if (result.data.connected == false) {
                            $state.go('home');
                        }
                        ;
                    }
                }, function (err) {
                    alert("user Not Logged");
                });
            }

        });

}]);
