/* global trackerCapture, angular */

import qrcode from 'qrcode-generator';
import ngQrcode from 'angular-qrcode';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import vfs from "./vfs";
import getPdfDef from "./pdf_def";
import QRCode from "qrcode";

pdfMake.vfs = vfs;

var trackerCapture = angular.module('trackerCapture');
trackerCapture.controller('VaccinationController',
    function ($scope,
        $translate,
        DateUtils,
        VaccineCertService,
        EnrollmentService,
        CurrentSelection,
        NotificationService,
        SessionStorageService,
        orderByFilter,
        UsersService) {
        var userProfile = SessionStorageService.get('USER_PROFILE');
        var storedBy = userProfile && userProfile.userCredentials && userProfile.userCredentials.username ? userProfile.userCredentials.username : '';

        var today = DateUtils.getToday();

        $scope.loading = {
            issue: false,
            all: true
        };

        $scope.certificate = {
            vaccinationNumber: {
                id: "pXK6VZwj00d",
                required: true
            },
            name: {
                id: "wi1E4HGW2zn",
                required: true
            },
            gender: {
                id: "I2kOTyjBaL7"
            },
            age: {
                id: "QkgK6iUTKV3"
            },
            address: {
                id: "phQypUuyU6Q"
            },
            nic: {
                id: "tJz1lz2sGrl",
                required: true
            },
            phone: {
                id: "eYViMjtiWRA",
            },
            doses: {
                dose1: {
                    id: "fZ3diyIwzDF"
                },
                dose2: {
                    id: "fZ3diyIwzDF"
                },
            },
            teiId: undefined,
            url1: undefined,
            url2: undefined,
            eligibility: true
        };

        $scope.qrImage = "";

        $scope.attrMap = {};
        $scope.dosesMap = {
            "fZ3diyIwzDF": $scope.certificate.doses.dose1,
            "fxIEVGCv63j": $scope.certificate.doses.dose2,
        };

        Object.values($scope.certificate).forEach(att => {
            if (att && att.id) {
                $scope.attrMap[att.id] = att;
            }
        });

        function setUrls(urls) {
            $scope.certificate.url1 = urls.url1;
            $scope.certificate.url2 = urls.url2;
            QRCode.toDataURL(urls.url1)
                .then(data => {
                    $scope.qrImage = data;
                }).catch(err => {
                    console.error("Error in generating QR", err);
                });
        }

        $scope.$on('dashboardWidgets', function () {
            $scope.selectedEnrollment = null;
            var selections = CurrentSelection.get();
            $scope.selectedTei = selections.tei;

            console.log("Selection", selections);

            if (selections && selections.tei) {
                $scope.certificate.teiId = selections.tei.trackedEntityInstance;
                selections.tei.attributes.forEach((att) => {
                    if ($scope.attrMap[att.attribute]) {
                        $scope.attrMap[att.attribute].value = att.value;
                    }
                });
            }

            let enrollment = selections.enrollments.find(e => e.program === "aLZQ5fSVdQc");

            if (enrollment && enrollment.events) {
                enrollment.events.forEach(ev => {
                    let eventData = {};
                    ev.dataValues.forEach(dv => {
                        eventData[dv.dataElement] = dv.value;
                    });

                    if ($scope.dosesMap[ev.programStage]) {
                        $scope.dosesMap[ev.programStage].date = eventData["HLnrx4pz8H1"];
                        $scope.dosesMap[ev.programStage].given = eventData["sEgbpR5sGP6"] || eventData["N9h0aYEaS0i"];
                        $scope.dosesMap[ev.programStage].batch = eventData["T8o6oTkS2OH"];
                        $scope.dosesMap[ev.programStage].type = eventData["J1HZdZNWqMb"] || eventData["R50Qdvrf768"];
                        $scope.dosesMap[ev.programStage].place = ev.orgUnitName;
                    }
                });
            }

            // query for existing cert
            VaccineCertService.certReady($scope.certificate.teiId).then(setUrls).catch(err => {
                console.warn("No certificate available in server side");
            }).finally(() => {
                console.log("Finally....")
                $scope.$apply(function () {
                    $scope.loading.all = false;
                });
            });

            // determine eligibility
            Object.values($scope.certificate).forEach(att => {
                if (att && att.required && !att.value) {
                    console.warn("Required field", att.id, "is not specified");
                    $scope.eligibility = false;
                }
            });

            if (!$scope.certificate.teiId) {
                $scope.eligibility = false;
            }

            console.log("Certificate", $scope.certificate);
        });

        $scope.sendSMS = function () {

        }

        $scope.issue = function () {
            console.log("Issuing certificate...");
            $scope.loading.issue = true;

            console.log("Name", $scope.certificate.name.value);

            // generate reports here
            const pdfDocGenerator = pdfMake.createPdf(getPdfDef(
                $scope.certificate.vaccinationNumber.value,
                $scope.certificate.name.value,
                $scope.certificate.gender.value,
                $scope.certificate.age.value,
                $scope.certificate.address.value,
                $scope.certificate.nic.value,
                $scope.certificate.doses.dose1,
                $scope.certificate.doses.dose2
            ));

            pdfDocGenerator.getBase64((data) => {
                let pdf1 = data;
                let pdf2 = data;

                VaccineCertService.persist($scope.certificate.teiId, pdf1, pdf2).then((urls) => {
                    console.log("Certificate issued...", urls);
                    setUrls(urls);
                    $scope.$apply(function () {
                        $scope.loading.issue = false;
                    });
                }).catch(err => {
                    console.warn("Error occurred when issuing the certificate", err);
                    $scope.$apply(function () {
                        $scope.loading.issue = false;
                    });
                });
            });
        }
    });
